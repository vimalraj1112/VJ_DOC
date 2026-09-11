import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

export function signTokens(userId: string, role: string) {
  const access = jwt.sign({ sub: userId, role }, env.jwtSecret, { expiresIn: ACCESS_TTL });
  const refresh = jwt.sign({ sub: userId, role }, env.jwtRefreshSecret, { expiresIn: REFRESH_TTL });
  return { accessToken: access, refreshToken: refresh };
}

export interface AuthedRequest extends Request {
  userId: string;
  role: string;
}

/**
 * Optional auth: routes that need a user call verifyAccessToken; everything
 * else stays anonymous-friendly. So this middleware must be explicitly added.
 */
export function verifyAccessToken(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    next(ApiError.unauthorized());
    return;
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    (req as AuthedRequest).userId = String(payload.sub);
    (req as AuthedRequest).role = typeof payload.role === 'string' ? payload.role : 'USER';
    next();
  } catch {
    next(ApiError.unauthorized('Your session has expired. Please sign in again.'));
  }
}

export function refreshAccessToken(refreshToken: string): { accessToken: string } | null {
  try {
    const payload = jwt.verify(refreshToken, env.jwtRefreshSecret) as JwtPayload;
    const access = jwt.sign({ sub: payload.sub, role: payload.role ?? 'USER' }, env.jwtSecret, { expiresIn: ACCESS_TTL });
    return { accessToken: access };
  } catch {
    return null;
  }
}