import { Router } from 'express';
import { ok } from '../utils/respond.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import { isDatabaseReady } from '../config/db.js';
import { getStorage } from '../storage/index.js';

const router = Router();

/** Lightweight readiness probe for load balancers / uptime checks. */
router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    getStorage(); // throws if storage misconfigured
    ok(res, { status: 'ok', db: isDatabaseReady() ? 'up' : 'down', env: env.nodeEnv, time: new Date().toISOString() });
  }),
);

export default router;