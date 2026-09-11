import { randomUUID } from 'node:crypto';
import { getStorage } from '../storage/index.js';
import { FileModel, type FileDoc } from '../models/File.js';
import { ProcessingJobModel, type ProcessingJobDoc } from '../models/ProcessingJob.js';
import { ActivityLogModel } from '../models/ActivityLog.js';
import { JOB_STATUS, stageLabelFor } from '../config/constants.js';
import { getToolConfig } from '../config/toolRegistry.js';
import { resolveProcessor } from '../processors/index.js';
import type { ProcessorContext, ProcessorInput } from '../processors/index.js';
import { ApiError, ERROR_CODES } from '../utils/ApiError.js';
import { sniffer } from './sniff.js';
import type { AcceptedKind } from '../config/toolRegistry.js';
import type { SniffedKind } from '../utils/fileSignature.js';

/** Collapses a magic-byte sniff into the file model's coarse kind bucket. */
function fileKindOf(kind: SniffedKind): 'pdf' | 'image' | 'archive' | 'other' {
  if (kind === 'pdf') return 'pdf';
  if (kind === 'zip') return 'archive';
  if (['png', 'jpeg', 'webp', 'gif'].includes(kind)) return 'image';
  return 'other';
}
import { emitJobCancelled, emitJobCompleted, emitJobFailed, emitJobProgress } from './socket.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { sanitizeDisplayName, createStorageKey } from '../utils/files.js';

/** Live jobs we can still cancel/abort in this process. */
const activeControllers = new Map<string, AbortController>();

export interface SubmitFileInput {
  /** Absolute path of the uploaded temp file. */
  diskPath: string;
  /** Client-supplied name (trusted for display only). */
  originalName: string;
  size: number;
}

export interface SubmitJobArgs {
  toolId: string;
  files: SubmitFileInput[];
  options: Record<string, unknown>;
  userId?: string | null;
  clientFingerprint?: string | null;
}

export interface SubmitJobResponse {
  job: ProcessingJobDoc;
  outputFiles: FileDoc[];
}

/**
 * Upload → persist inputs → run processor → persist outputs → respond.
 * Progress is pushed over Socket.IO as it happens.
 */
export async function submitJob(args: SubmitJobArgs): Promise<SubmitJobResponse> {
  const tool = getToolConfig(args.toolId);
  if (!tool) throw ApiError.notFound(`Unknown tool: "${args.toolId}"`);

  const storage = getStorage();
  const inputFiles: FileDoc[] = [];

  // 1. Validate each upload by sniffing its actual bytes.
  const prepared: ProcessorInput[] = [];
  for (const file of args.files) {
    const sniff = await sniffer(file);
    if (!tool.accepts.includes(sniff.kind as AcceptedKind)) {
      throw ApiError.unsupportedType(
        `"${file.originalName}" looks like ${sniff.label}, not one of: ${tool.accepts.join(', ')}.`,
      );
    }

    const storageKey = createStorageKey(sniff.mimeType === 'application/pdf' ? '.pdf' : sniff.ext);
    const saved = await storage.saveFromPath(storageKey, file.diskPath, {
      contentType: sniff.mimeType,
      metadata: { original: file.originalName },
    });

    const doc = await FileModel.create({
      userId: args.userId ?? null,
      originalName: sanitizeDisplayName(file.originalName),
      storageKey,
      mimeType: sniff.mimeType,
      kind: fileKindOf(sniff.kind),
      size: saved.size,
      downloadToken: randomUUID(),
      status: 'READY',
      expiresAt: new Date(Date.now() + env.fileTtlHours * 60 * 60 * 1000),
    });

    const diskPath = await storage.resolvePath(storageKey);
    prepared.push({
      fileId: String(doc._id),
      buffer: Buffer.alloc(0),
      diskPath,
      name: sanitizeDisplayName(file.originalName),
      mimeType: sniff.mimeType,
    });
    inputFiles.push(doc);
  }

  // Safety: if anything below fails, never leave orphaned bytes behind.
  const rollbackInputs = async (): Promise<void> => {
    await Promise.allSettled(inputFiles.map((f) => storage.delete(f.storageKey)));
    if (inputFiles.length) await FileModel.deleteMany({ _id: { $in: inputFiles.map((f) => f._id) } });
  };

  // 2. Create the job.
  const job = await ProcessingJobModel.create({
    userId: args.userId ?? null,
    operation: tool.id,
    options: { ...tool.defaultOptions, ...args.options },
    inputFiles: inputFiles.map((f) => f._id),
    status: JOB_STATUS.PROCESSING,
    progress: 5,
    stage: 'Analyzing',
    startedAt: new Date(),
    expiresAt: new Date(Date.now() + env.fileTtlHours * 60 * 60 * 1000),
    clientFingerprint: args.clientFingerprint ?? null,
  });

  const controller = new AbortController();
  activeControllers.set(String(job._id), controller);

  try {
    // 3. Run the processor, streaming progress.
    const progress = makeProgressReporter(job);
    progress(10, 'Analyzing');

    const mergedOptions = job.options as Record<string, unknown>;

    // Read each input into memory just before processing.
    for (let i = 0; i < prepared.length; i++) {
      prepared[i].buffer = await storage.read(inputFiles[i].storageKey);
    }

    const processor = resolveProcessor(tool.processor);
    const result = await processor({
      toolId: tool.id,
      inputs: prepared,
      options: mergedOptions,
      signal: controller.signal,
      onProgress: (p) => progress(p.percent, p.stage),
    } satisfies ProcessorContext);

    // 4. Persist outputs.
    const outputFiles: FileDoc[] = [];
    for (const output of result.outputs) {
      const outKey = createStorageKey(output.ext);
      const saved = await storage.save(outKey, output.buffer, { contentType: output.mimeType });
      const outDoc = await FileModel.create({
        userId: args.userId ?? null,
        originalName: sanitizeDisplayName(output.filename),
        storageKey: outKey,
        mimeType: output.mimeType,
        kind: output.mimeType === 'application/pdf' ? 'pdf' : output.mimeType.startsWith('image/') ? 'image' : 'archive',
        size: saved.size,
        pages: output.pages,
        jobId: job._id,
        downloadToken: randomUUID(),
        status: 'READY',
        expiresAt: new Date(Date.now() + env.fileTtlHours * 60 * 60 * 1000),
      });
      outputFiles.push(outDoc);
    }

    // 5. Finalise.
    job.outputFiles = outputFiles.map((f) => f._id);
    job.status = JOB_STATUS.COMPLETED;
    job.progress = 100;
    job.stage = 'Ready';
    job.completedAt = new Date();
    await job.save();

    emitJobCompleted(String(job._id), {
      outputFiles: outputFiles.map((f) => String(f._id)),
      progress: 100,
    });

    await ActivityLogModel.create({
      userId: args.userId ?? null,
      action: 'tool:complete',
      jobId: job._id,
      meta: { tool: tool.id, inputs: prepared.length, outputs: outputFiles.length, size: outputFiles.reduce((s, f) => s + f.size, 0) },
      ip: args.clientFingerprint ?? null,
    });

    return { job, outputFiles };
  } catch (error) {
    await rollbackInputs();
    await failJob(job, error);
    throw normalizeError(error);
  } finally {
    activeControllers.delete(String(job._id));
  }
}

export async function cancelJob(jobId: string): Promise<void> {
  const controller = activeControllers.get(jobId);
  const job = await ProcessingJobModel.findById(jobId);
  if (!job) throw ApiError.notFound('Job not found.');
  if (controller) controller.abort();
  if (job.status === JOB_STATUS.PROCESSING) {
    job.status = JOB_STATUS.CANCELLED;
    job.stage = 'Cancelled';
    await job.save();
    emitJobCancelled(jobId);
  }
}

async function failJob(job: ProcessingJobDoc, error: unknown): Promise<void> {
  const isApi = error instanceof ApiError;
  job.status = JOB_STATUS.FAILED;
  job.progress = 0;
  job.stage = 'Failed';
  job.error = isApi ? error.message : 'Something went wrong while processing your document.';
  job.errorCode = isApi ? error.code : ERROR_CODES.PROCESSING_FAILED;
  job.completedAt = new Date();
  await job.save();
  emitJobFailed(String(job._id), job.error ?? 'Processing failed.');
}

function normalizeError(error: unknown): unknown {
  if (error instanceof ApiError) return error;
  if (error instanceof Error && error.name === 'AbortError') {
    return new ApiError(409, ERROR_CODES.JOB_CANCELLED, 'Processing was cancelled.');
  }
  logger.error('Processor failure:', error);
  return ApiError.processingFailed();
}

/** Converts 0-100 processor progress into throttled DB writes + socket emits. */
function makeProgressReporter(job: ProcessingJobDoc) {
  let lastWrite = 0;
  return async (percent: number, stage: string): Promise<void> => {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    job.progress = clamped;
    job.stage = stage || stageLabelFor(clamped);

    const now = Date.now();
    if (now - lastWrite > 200 || clamped >= 100) {
      lastWrite = now;
      await job.save().catch(() => undefined);
      emitJobProgress(String(job._id), clamped, job.stage);
    }
  };
}