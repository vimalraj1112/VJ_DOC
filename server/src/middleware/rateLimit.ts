import { rateLimit } from 'express-rate-limit';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

/**
 * Anonymous users are metered per IP. Real product limits also depend on a
 * user's plan, which we hitch onto the plan overlay once auth exists.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.isProd ? 200 : 2000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, _next, _options) => {
    throw ApiError.rateLimited();
  },
});

/** Stricter limiter for authenticated write endpoints. */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.isProd ? 60 : 500,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: () => {
    throw ApiError.rateLimited('Too many requests. Please try again shortly.');
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProd ? 20 : 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: () => {
    throw ApiError.rateLimited('Too many attempts. Please wait a few minutes.');
  },
});