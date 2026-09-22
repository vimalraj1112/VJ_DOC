import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { ApiError } from '../utils/ApiError.js';
import { apiRateLimiter } from '../middleware/rateLimit.js';
import { uploadFiles, clearUploadedFiles } from '../middleware/upload.js';
import { submitJob } from '../services/jobService.js';
import { getToolConfig, toolRegistry } from '../config/toolRegistry.js';

const router = Router();

/** List every supported tool with its accepted input kinds. */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const data = Object.values(toolRegistry).map((t) => ({
      id: t.id,
      label: t.label,
      accepts: t.accepts,
      minFiles: t.minFiles,
      maxFiles: t.maxFiles,
      singleOutput: t.singleOutput,
    }));
    ok(res, data);
  }),
);

const optionsSchema = z
  .object({
    pageSize: z.string().optional(),
    orientation: z.string().optional(),
    margin: z.string().optional(),
    imageFit: z.string().optional(),
    quality: z.union([z.number(), z.string()]).optional(),
    rotate: z.array(z.number()).optional(),
    format: z.string().optional(),
    mode: z.string().optional(),
    pages: z.array(z.union([z.number(), z.string()])).optional(),
    scale: z.number().optional(),
    op: z.string().optional(),
    every: z.number().optional(),
  })
  .passthrough();

/**
 * POST /tools/:toolId/process
 * multipart form: `files[]` plus JSON options under the `options` field.
 */
router.post(
  '/:toolId/process',
  apiRateLimiter,
  uploadFiles('files'),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const inputFiles = req.files as unknown as Express.Multer.File[] | undefined;

    try {
      const toolId = req.params.toolId;
      const tool = getToolConfig(toolId);
      if (!tool) throw ApiError.notFound(`Unknown tool: "${toolId}"`);

      if (files.length < tool.minFiles) {
        throw ApiError.badRequest(`"${tool.label}" needs at least ${tool.minFiles} file${tool.minFiles === 1 ? '' : 's'}.`);
      }
      if (files.length > tool.maxFiles) {
        throw ApiError.badRequest(`"${tool.label}" accepts at most ${tool.maxFiles} files.`);
      }

      let options: Record<string, unknown> = {};
      const rawOptions = req.body?.options;
      if (rawOptions) {
        let parsedObj: unknown = rawOptions;
        if (typeof rawOptions === 'string') {
          try {
            parsedObj = JSON.parse(rawOptions);
          } catch {
            throw ApiError.badRequest('Processing options are not valid JSON.');
          }
        }
        const parsed = optionsSchema.safeParse(parsedObj);
        if (!parsed.success) {
          const detail = parsed.error.issues[0];
          throw ApiError.badRequest(`Invalid processing option: ${detail.path.join('.') || 'options'} — ${detail.message}`);
        }
        options = parsed.data;
      }

      const fingerprint =
        `${(req.ip ?? '')}:${String(req.headers['user-agent'] ?? '').slice(0, 80)}` ||
        'unknown';

      const result = await submitJob({
        toolId,
        files: files.map((f) => ({ diskPath: f.path, originalName: f.originalname, size: f.size })),
        options,
        userId: null,
        clientFingerprint: fingerprint,
      });

      // 202 Accepted: the job is queued and runs off the HTTP request. The
      // client tracks progress/completion via Socket.IO or a GET /jobs/:id poll.
      ok(
        res,
        {
          job: mapJob(result.job),
          outputFiles: result.outputFiles.map(mapFile),
        },
        202,
      );
    } finally {
      if (inputFiles) await clearUploadedFiles(inputFiles);
    }
  }),
);

function mapJob(job: { _id: unknown; operation: unknown; status: unknown; progress: unknown; stage: unknown; outputFiles: unknown }) {
  return {
    id: String(job._id),
    operation: job.operation,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    outputFiles: (job.outputFiles as unknown[]).map(String),
  };
}

interface FileRow {
  _id: unknown;
  originalName: unknown;
  mimeType: unknown;
  size: unknown;
  pages?: unknown | null;
  isFavorite?: unknown;
  downloadToken: unknown;
  expiresAt: unknown;
  kind?: unknown;
}

function mapFile(f: FileRow) {
  return {
    id: String(f._id),
    name: f.originalName,
    mimeType: f.mimeType,
    size: f.size,
    pages: f.pages ?? null,
    kind: f.kind,
    favorite: Boolean(f.isFavorite),
    downloadToken: f.downloadToken,
    expiresAt: f.expiresAt,
  };
}

export default router;