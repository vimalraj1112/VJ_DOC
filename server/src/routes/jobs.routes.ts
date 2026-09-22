import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { ApiError } from '../utils/ApiError.js';
import { cancelJob } from '../services/jobService.js';
import { ProcessingJobModel } from '../models/ProcessingJob.js';
import { FileModel } from '../models/File.js';

const router = Router();

/** Fetch a job's current state — used for socket-less refresh / recovery. */
router.get(
  '/:jobId',
  asyncHandler(async (req, res) => {
    const job = await ProcessingJobModel.findById(req.params.jobId);
    if (!job) throw ApiError.notFound('Job not found.');

    const outputFiles = await FileModel.find({ _id: { $in: job.outputFiles } }).sort({ createdAt: 1 });

    ok(res, {
      id: String(job._id),
      operation: job.operation,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      error: job.error,
      outputFiles: outputFiles.map((f) => String(f._id)),
      files: outputFiles.map(mapFile),
    });
  }),
);

/** Cancel an in-flight job. If it's already finished, this is a no-op. */
router.delete(
  '/:jobId',
  asyncHandler(async (req, res) => {
    await cancelJob(req.params.jobId);
    ok(res, { id: req.params.jobId, cancelled: true });
  }),
);

interface FileRow {
  _id: unknown;
  originalName: unknown;
  mimeType: unknown;
  size: unknown;
  pages?: unknown | null;
  kind?: unknown;
  downloadToken: unknown;
  expiresAt: unknown;
}

function mapFile(f: FileRow) {
  return {
    id: String(f._id),
    name: f.originalName,
    mimeType: f.mimeType,
    size: f.size,
    pages: f.pages ?? null,
    kind: f.kind,
    favorite: false,
    downloadToken: f.downloadToken,
    expiresAt: f.expiresAt,
  };
}

export default router;