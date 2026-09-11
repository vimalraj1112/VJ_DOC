import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { cancelJob } from '../services/jobService.js';

const router = Router();

/** Cancel an in-flight job. If it's already finished, this is a no-op. */
router.delete(
  '/:jobId',
  asyncHandler(async (req, res) => {
    await cancelJob(req.params.jobId);
    ok(res, { id: req.params.jobId, cancelled: true });
  }),
);

export default router;