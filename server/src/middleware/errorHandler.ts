import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { ApiError, ERROR_CODES } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

/**
 * Central error handler. Guarantees the wire format is always:
 *   { success: false, message, code [, details] }
 * Stack traces and internal paths never reach the client.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) return;

  // Zod input-validation errors -> tidy 400.
  if (error instanceof ZodError) {
    const first = error.issues[0];
    res.status(400).json({
      success: false,
      message: first ? first.message : 'Invalid request.',
      code: ERROR_CODES.VALIDATION_ERROR,
      details: { issues: error.issues },
    });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
      ...(error.details === undefined ? {} : { details: error.details }),
    });
    return;
  }

  // Unknown error. Log the details server-side and reveal nothing.
  logger.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: env.isProd ? 'Something went wrong on our side.' : String(error && (error as Error).message),
    code: ERROR_CODES.INTERNAL_ERROR,
  });
};

/** 404 for unmatched API routes (non-error body shape). */
export const notFoundHandler = (_req: never, res: { status: (code: number) => { json: (b: unknown) => void } }): void => {
  res.status(404).json({ success: false, message: 'Route not found.', code: 'NOT_FOUND' });
};