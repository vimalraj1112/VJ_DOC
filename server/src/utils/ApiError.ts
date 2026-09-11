/**
 * Every operational failure in the API is expressed as an ApiError.
 * The central error handler turns these into the standard envelope:
 *   { success: false, message, code }
 */

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  TOO_MANY_FILES: 'TOO_MANY_FILES',
  RATE_LIMITED: 'RATE_LIMITED',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  PROCESSOR_UNAVAILABLE: 'PROCESSOR_UNAVAILABLE',
  ENCRYPTED_PDF: 'ENCRYPTED_PDF',
  JOB_CANCELLED: 'JOB_CANCELLED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, ERROR_CODES.VALIDATION_ERROR, message, details);
  }

  static unauthorized(message = 'You need to be signed in to do that.') {
    return new ApiError(401, ERROR_CODES.UNAUTHORIZED, message);
  }

  static forbidden(message = 'You do not have access to this resource.') {
    return new ApiError(403, ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(message = 'We could not find what you were looking for.') {
    return new ApiError(404, ERROR_CODES.NOT_FOUND, message);
  }

  static payloadTooLarge(message = 'That file is larger than the allowed limit.') {
    return new ApiError(413, ERROR_CODES.FILE_TOO_LARGE, message);
  }

  static unsupportedType(message = 'That file type is not supported here.') {
    return new ApiError(415, ERROR_CODES.UNSUPPORTED_FILE_TYPE, message);
  }

  static rateLimited(message = 'Too many requests. Please slow down and try again shortly.') {
    return new ApiError(429, ERROR_CODES.RATE_LIMITED, message);
  }

  static processingFailed(message = 'The document could not be processed.') {
    return new ApiError(422, ERROR_CODES.PROCESSING_FAILED, message);
  }

  static processorUnavailable(tool: string) {
    return new ApiError(
      501,
      ERROR_CODES.PROCESSOR_UNAVAILABLE,
      `The conversion engine required for "${tool}" is not available on this server.`,
    );
  }

  static internal(message = 'Something went wrong on our side.') {
    return new ApiError(500, ERROR_CODES.INTERNAL_ERROR, message);
  }
}
