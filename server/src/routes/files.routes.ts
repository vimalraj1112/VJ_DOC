import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { FileModel } from '../models/File.js';
import { getStorage } from '../storage/index.js';
import { strictRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

/** Resolves the token-guarded file or 404s. */
async function authorizeFile(id: string, token: unknown) {
  if (typeof token !== 'string' || token.length < 8) throw ApiError.forbidden();
  const file = await FileModel.findOne({ _id: id, downloadToken: token, status: { $in: ['READY', 'PENDING'] } });
  if (!file) throw ApiError.notFound('That file is no longer available. Shared links expire after 24 hours.');
  return file;
}

/**
 * GET /files/:id/download?token=…
 * Forces an attachment download with the user's safe display name.
 */
router.get(
  '/:id/download',
  strictRateLimiter,
  asyncHandler(async (req, res) => {
    const file = await authorizeFile(req.params.id, req.query.token);
    const storage = getStorage();
    const buffer = await storage.read(file.storageKey);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', buffer.byteLength);
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeHeaderName(file.originalName)}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(buffer);
  }),
);

/**
 * GET /files/:id/view?token=…
 * Inline display (PDF viewer / image preview).
 */
router.get(
  '/:id/view',
  strictRateLimiter,
  asyncHandler(async (req, res) => {
    const file = await authorizeFile(req.params.id, req.query.token);
    const storage = getStorage();
    const buffer = await storage.read(file.storageKey);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', buffer.byteLength);
    res.setHeader('Content-Disposition', `inline; filename="${sanitizeHeaderName(file.originalName)}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(buffer);
  }),
);

function sanitizeHeaderName(name: string): string {
  return name.replace(/["]/g, "_").replace(new RegExp("[\u0000-\u001F]", "g"), " ");
}

export default router;