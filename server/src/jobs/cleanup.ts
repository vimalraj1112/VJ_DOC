import { FileModel } from '../models/File.js';
import { ProcessingJobModel } from '../models/ProcessingJob.js';
import { getStorage } from '../storage/index.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * Reaps expired temporary files and jobs so storage never fills up with
 * anonymous processing artefacts. Files self-expire after `FILE_TTL_HOURS`.
 * Sweeps hourly, plus once shortly after boot.
 */
export async function runCleanup(): Promise<void> {
  const storage = getStorage();
  const now = new Date();

  // 1. Expired input/output files: delete bytes, then the docs.
  const expiredFiles = await FileModel.find({ expiresAt: { $lte: now }, status: { $ne: 'DELETED' } }).lean();
  let deletedBytes = 0;
  let deletedCount = 0;

  for (const file of expiredFiles) {
    await storage.delete(file.storageKey).catch(() => undefined);
    deletedBytes += Number(file.size) || 0;
    deletedCount += 1;
  }
  if (deletedCount) {
    await FileModel.updateMany(
      { _id: { $in: expiredFiles.map((f) => f._id) } },
      { $set: { status: 'DELETED' } },
    );
    logger.job(`Cleanup: removed ${deletedCount} expired files (${(deletedBytes / 1024 / 1024).toFixed(1)} MB)`);
  }

  // 2. Overdue jobs.
  const expiredJobs = await ProcessingJobModel.updateMany(
    {
      expiresAt: { $lte: now },
      status: { $in: ['PROCESSING', 'QUEUED'] },
    },
    { $set: { status: 'FAILED', stage: 'Timed out', error: 'Processing exceeded its time limit.' } },
  );
  if (expiredJobs.modifiedCount) logger.job(`Cleanup: timed out ${expiredJobs.modifiedCount} stale jobs`);
}

let timer: NodeJS.Timeout | null = null;

export function startCleanupScheduler(): void {
  const HOUR_MS = 60 * 60 * 1000;
  // First sweep a minute after boot.
  setTimeout(() => runCleanup().catch((e) => logger.error('Initial cleanup failed:', e)), 60 * 1000);
  timer = setInterval(
    () => runCleanup().catch((e) => logger.error('Periodic cleanup failed:', e)),
    env.isProd ? HOUR_MS : HOUR_MS * 3,
  );
  timer.unref?.();
}

export function stopCleanupScheduler(): void {
  if (timer) clearInterval(timer);
}