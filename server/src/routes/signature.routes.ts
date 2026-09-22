import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { ApiError } from '../utils/ApiError.js';
import { apiRateLimiter } from '../middleware/rateLimit.js';
import { uploadFiles, clearUploadedFiles } from '../middleware/upload.js';
import { SignatureRequestModel } from '../models/SignatureRequest.js';
import {
  createSignatureRequest,
  signSignatureRequest,
  cancelSignatureRequest,
  toPublicRequest,
} from '../services/signatureService.js';

const router = Router();

/**
 * POST /signatures
 * multipart: `files` (exactly one PDF) plus JSON options under `options`
 * (`documentTitle`, `signerName`, `signerEmail`).
 * Returns a private signing link to share with the recipient.
 */
router.post(
  '/',
  apiRateLimiter,
  uploadFiles('files'),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length !== 1) {
      throw ApiError.badRequest('Signature requests need exactly one PDF.');
    }

    let options: Record<string, unknown> = {};
    const rawOptions = req.body?.options;
    if (rawOptions) {
      if (typeof rawOptions === 'string') {
        try {
          options = JSON.parse(rawOptions);
        } catch {
          throw ApiError.badRequest('Processing options are not valid JSON.');
        }
      } else {
        options = rawOptions;
      }
    }

    try {
      const fingerprint =
        `${(req.ip ?? '')}:${String(req.headers['user-agent'] ?? '').slice(0, 80)}` || 'unknown';

      const { request, signingUrl } = await createSignatureRequest({
        diskPath: files[0].path,
        originalName: files[0].originalname,
        size: files[0].size,
        options,
        clientFingerprint: fingerprint,
      });

      ok(
        res,
        {
          ...toPublicRequest(request),
          token: request.token,
          signingUrl,
        },
        201,
      );
    } finally {
      await clearUploadedFiles(files);
    }
  }),
);

/** GET /signatures/:token — public page data for the signer. */
router.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const request = await findByToken(req.params.token);
    ok(res, toPublicRequest(request));
  }),
);

/** POST /signatures/:token/sign — body `{ name }`; returns the signed PDF. */
router.post(
  '/:token/sign',
  apiRateLimiter,
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    if (!name) throw ApiError.badRequest('Type your name to sign.');

    const { buffer, filename, pages } = await signSignatureRequest(req.params.token, name);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-VJ-Pages': String(pages),
    });
    res.send(buffer);
  }),
);

/** DELETE /signatures/:token — cancel a request that has not been signed yet. */
router.delete(
  '/:token',
  asyncHandler(async (req, res) => {
    const request = await cancelSignatureRequest(req.params.token);
    ok(res, { id: String(request._id), status: request.status });
  }),
);

async function findByToken(token: string) {
  const request = await SignatureRequestModel.findOne({ token });
  if (!request) throw ApiError.notFound('This signing link is invalid or has expired.');
  return request;
}

export default router;