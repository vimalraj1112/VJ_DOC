import type { Response } from 'express';

/** Standard success envelope: { success: true, data } */
export function ok<T>(res: Response, data: T, statusCode = 200): Response {
  return res.status(statusCode).json({ success: true, data });
}

/** Standard failure envelope: { success: false, message, code } */
export function fail(
  res: Response,
  statusCode: number,
  message: string,
  code: string,
  details?: unknown,
): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(details === undefined ? {} : { details }),
  });
}
