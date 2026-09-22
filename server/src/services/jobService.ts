import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getStorage } from '../storage/index.js';
import { FileModel, type FileDoc } from '../models/File.js';
import { ProcessingJobModel, type ProcessingJobDoc } from '../models/ProcessingJob.js';
import { ActivityLogModel } from '../models/ActivityLog.js';
import { JOB_STATUS, stageLabelFor } from '../config/constants.js';
import { getToolConfig } from '../config/toolRegistry.js';
import { resolveProcessor } from '../processors/index.js';
import type { ProcessorContext, ProcessorInput } from '../processors/index.js';
import { ApiError, ERROR_CODES } from '../utils/ApiError.js';
import { sniffer, classifyOffice, OFFICE_MIME_TYPES } from './sniff.js';
import type { AcceptedKind } from '../config/toolRegistry.js';
import type { SniffedKind } from '../utils/fileSignature.js';
import { emitJobCancelled, emitJobCompleted, emitJobFailed, emitJobProgress } from './socket.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { sanitizeDisplayName, createStorageKey } from '../utils/files.js';
import { enqueueJob, registerJob, getAbortController, cancelJob as cancelQueuedJob } from '../jobs/queue.js';

/** Collapses a magic-byte sniff into the file model's coarse kind bucket. */
function fileKindOf(kind: SniffedKind): 'pdf' | 'image' | 'archive' | 'other' {
  if (kind === 'pdf') return 'pdf';
  if (kind === 'zip' || kind === 'docx' || kind === 'xlsx' || kind === 'pptx') return 'archive';
  if (['png', 'jpeg', 'webp', 'gif'].includes(kind)) return 'image';
  return 'other';
}

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

const OFFICE_KINDS: AcceptedKind[] = ['docx', 'xlsx', 'pptx'];

/**
 * Accepts the files and queues the job. The HTTP handler returns as soon as
 * the job is persisted; processing runs on the in-process queue and progress
 * streams to the client over Socket.IO.
 */
export async function submitJob(args: SubmitJobArgs): Promise<SubmitJobResponse> {
  const tool = getToolConfig(args.toolId);
  if (!tool) throw ApiError.notFound(`Unknown tool: "${args.toolId}"`);

  const storage = getStorage();
  const inputFiles: FileDoc[] = [];

  // 1. Validate each upload by sniffing its actual bytes.
  const prepared: ProcessorInput[] = [];
  const wantsOffice = tool.accepts.some((k) => OFFICE_KINDS.includes(k as AcceptedKind));
  const expectedOffice = wantsOffice ? (tool.accepts.find((k) => OFFICE_KINDS.includes(k as AcceptedKind)) as AcceptedKind) : null;

  for (const file of args.files) {
    const sniff = await sniffer(file);

    if (wantsOffice) {
      // OOXML documents sniff as `zip` at the head; confirm the exact flavour
      // (docx/xlsx/pptx) against the full file before accepting.
      if (sniff.kind !== 'zip') {
        throw ApiError.unsupportedType(
          `"${file.originalName}" looks like ${sniff.label}, not one of: ${tool.accepts.join(', ')}.`,
        );
      }
      const full = await readFile(file.diskPath);
      const found = classifyOffice(full);
      if (found !== expectedOffice) {
        throw ApiError.unsupportedType(
          `"${file.originalName}" is ${found ? `not ${expectedOffice?.toUpperCase()}` : 'not an Office document'}, so this tool cannot use it.`,
        );
      }
    } else if (!tool.accepts.includes(sniff.kind as AcceptedKind)) {
      throw ApiError.unsupportedType(
        `"${file.originalName}" looks like ${sniff.label}, not one of: ${tool.accepts.join(', ')}.`,
      );
    }

    const storageKey = createStorageKey(sniff.mimeType === 'application/pdf' ? '.pdf' : sniff.ext);
    const mimeForOffice = officeMimeFor(expectedOffice);
    const contentType = wantsOffice ? mimeForOffice : sniff.mimeType;
    const saved = await storage.saveFromPath(storageKey, file.diskPath, {
      contentType,
      metadata: { original: file.originalName },
    });

    const doc = await FileModel.create({
      userId: args.userId ?? null,
      originalName: sanitizeDisplayName(file.originalName),
      storageKey,
      mimeType: contentType,
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
      mimeType: contentType,
    });
    inputFiles.push(doc);
  }

  // 2. Create the job in QUEUED state and hand it to the queue.
  const job = await ProcessingJobModel.create({
    userId: args.userId ?? null,
    operation: tool.id,
    options: { ...tool.defaultOptions, ...args.options },
    inputFiles: inputFiles.map((f) => f._id),
    status: JOB_STATUS.QUEUED,
    progress: 3,
    stage: 'Queued',
    expiresAt: new Date(Date.now() + env.fileTtlHours * 60 * 60 * 1000),
    clientFingerprint: args.clientFingerprint ?? null,
  });

  registerJob(String(job._id));
  enqueueJob({
    id: String(job._id),
    priority: args.options?.priority === true,
    run: () => runQueuedJob(String(job._id), tool.id, prepared, inputFiles, args),
  });

  return { job, outputFiles: [] };
}

/** Executes one queued job: process → persist outputs → emit result. */
async function runQueuedJob(
  jobId: string,
  toolId: string,
  prepared: ProcessorInput[],
  inputFiles: FileDoc[],
  args: SubmitJobArgs,
): Promise<void> {
  const job = await ProcessingJobModel.findById(jobId);
  if (!job || job.status === JOB_STATUS.CANCELLED) {
    await rollbackInputs(inputFiles);
    return;
  }

  const tool = getToolConfig(toolId)!;
  const storage = getStorage();
  const controller = getAbortController(jobId) ?? new AbortController();

  job.status = JOB_STATUS.PROCESSING;
  job.progress = 5;
  job.stage = 'Analyzing';
  job.startedAt = new Date();
  await job.save().catch(() => undefined);

  try {
    const progress = makeProgressReporter(job);

    // Read each input into memory just before processing.
    for (let i = 0; i < prepared.length; i++) {
      prepared[i].buffer = await storage.read(inputFiles[i].storageKey);
    }

    const processor = resolveProcessor(tool.processor);
    const result = await processor({
      toolId,
      inputs: prepared,
      options: job.options as Record<string, unknown>,
      signal: controller.signal,
      onProgress: (p) => progress(p.percent, p.stage),
    } satisfies ProcessorContext);

    // Persist outputs.
    const outputFiles: FileDoc[] = [];
    for (const output of result.outputs) {
      const outKey = createStorageKey(output.ext);
      const saved = await storage.save(outKey, output.buffer, { contentType: output.mimeType });
      const outDoc = await FileModel.create({
        userId: args.userId ?? null,
        originalName: sanitizeDisplayName(output.filename),
        storageKey: outKey,
        mimeType: output.mimeType,
        kind: kindForMime(output.mimeType),
        size: saved.size,
        pages: output.pages,
        jobId: job._id,
        downloadToken: randomUUID(),
        status: 'READY',
        expiresAt: new Date(Date.now() + env.fileTtlHours * 60 * 60 * 1000),
      });
      outputFiles.push(outDoc);
    }

    job.outputFiles = outputFiles.map((f) => f._id);
    job.status = JOB_STATUS.COMPLETED;
    job.progress = 100;
    job.stage = 'Ready';
    job.completedAt = new Date();
    await job.save();

    emitJobCompleted(jobId, { outputFiles: outputFiles.map((f) => String(f._id)), progress: 100 });

    await ActivityLogModel.create({
      userId: args.userId ?? null,
      action: 'tool:complete',
      jobId: job._id,
      meta: { tool: toolId, inputs: prepared.length, outputs: outputFiles.length, size: outputFiles.reduce((s, f) => s + f.size, 0) },
      ip: args.clientFingerprint ?? null,
    });
  } catch (error) {
    const cancelled =
      controller.signal.aborted || (error instanceof Error && error.name === 'AbortError');
    const finalStatus = (job as { status?: string }).status;
    await rollbackInputs(inputFiles);
    if (!cancelled) {
      await failJob(job, error);
    } else if (finalStatus !== JOB_STATUS.CANCELLED) {
      // Aborted internally but not through the public cancel endpoint yet.
      job.status = JOB_STATUS.CANCELLED;
      job.stage = 'Cancelled';
      job.completedAt = new Date();
      await job.save().catch(() => undefined);
      emitJobCancelled(jobId);
    }
  }
}

export async function cancelJob(jobId: string): Promise<void> {
  const job = await ProcessingJobModel.findById(jobId);
  if (!job) throw ApiError.notFound('Job not found.');

  const signalled = cancelQueuedJob(jobId);

  if (job.status === JOB_STATUS.QUEUED || job.status === JOB_STATUS.PROCESSING) {
    job.status = JOB_STATUS.CANCELLED;
    job.stage = 'Cancelled';
    job.completedAt = new Date();
    await job.save();
    emitJobCancelled(jobId);
  }

  if (!signalled) queueMiss(jobId);
}

function queueMiss(jobId: string): void {
  logger.warn(`Cancel requested for ${jobId} but it is not active in the queue.`);
}

async function rollbackInputs(inputFiles: FileDoc[]): Promise<void> {
  const storage = getStorage();
  await Promise.allSettled(inputFiles.map((f) => storage.delete(f.storageKey)));
  if (inputFiles.length) await FileModel.deleteMany({ _id: { $in: inputFiles.map((f) => f._id) } });
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

function kindForMime(mime: string): 'pdf' | 'image' | 'archive' | 'other' {
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (mime.includes('zip') || mime.includes('document') || mime.includes('sheet') || mime.includes('presentation')) return 'archive';
  return 'other';
}

function officeMimeFor(kind: AcceptedKind | null): string {
  switch (kind) {
    case 'docx':
      return OFFICE_MIME_TYPES.docx;
    case 'xlsx':
      return OFFICE_MIME_TYPES.xlsx;
    case 'pptx':
      return OFFICE_MIME_TYPES.pptx;
    default:
      return 'application/octet-stream';
  }
}