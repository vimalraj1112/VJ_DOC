import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { env, maxFileSizeBytes } from '../config/env.js';

export const tempUploadRoot = path.resolve(env.storageLocalDir, '../tmp/uploads');

const INVALID_FILENAME = new RegExp('[\\u0000-\\u001F\\\\/:*?"<>|]');

/**
 * Files land in a per-request temp directory and are later moved into the
 * storage driver by the job service. We never trust extensions or client MIME
 * types — sniffing happens later against the real bytes.
 */
const multerInstance = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      const dir = path.join(tempUploadRoot, randomUUID());
      await fs.mkdir(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, _file, cb) => cb(null, randomUUID()),
  }),
  limits: {
    fileSize: maxFileSizeBytes,
    files: env.maxFilesPerRequest,
    fields: 20,
  },
  fileFilter: (_req, file, cb) => {
    if (INVALID_FILENAME.test(file.originalname || '')) {
      cb(ApiError.badRequest('The uploaded filename contains invalid characters.'));
      return;
    }
    cb(null, true);
  },
});

function normaliseMulterError(error: unknown): ApiError {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') return ApiError.payloadTooLarge();
    if (error.code === 'LIMIT_FILE_COUNT') {
      return ApiError.badRequest(`Too many files. Maximum ${env.maxFilesPerRequest} per request.`);
    }
    return ApiError.badRequest(error.message);
  }
  if (error instanceof ApiError) return error;
  return ApiError.badRequest('Upload failed.');
}

/**
 * Express middleware wrapping raw multer so every upload failure surfaces as a
 * standard ApiError through the central error handler.
 */
export function uploadFiles(fieldName = 'files'): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    multerInstance.array(fieldName, env.maxFilesPerRequest)(req, res, (error) => {
      try {
        if (error) throw normaliseMulterError(error);
        next();
      } catch (caught) {
        next(caught);
      }
    });
  };
}

/** Remove any partially-uploaded temp files (fired in a finally block). */
export async function clearUploadedFiles(files?: Express.Multer.File[]): Promise<void> {
  if (!files?.length) return;
  const dirs = new Set<string>();
  for (const f of files) {
    dirs.add(path.dirname(f.path));
    await fs.unlink(f.path).catch(() => undefined);
  }
  for (const dir of dirs) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}