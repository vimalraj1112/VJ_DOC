import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { ApiError } from '../utils/ApiError.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import { UserModel } from '../models/User.js';
import { signTokens, verifyAccessToken, type AuthedRequest } from '../services/tokenService.js';

const router = Router();

/**
 * Optional "soft sign-in": the product is fully usable anonymously, but users
 * may later create an account to keep history. Never blocks a tool.
 */

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
});

router.post(
  '/register',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const exists = await UserModel.exists({ email: body.email });
    if (exists) throw ApiError.badRequest('An account with that email already exists.');

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await UserModel.create({ name: body.name, email: body.email, passwordHash });

    const tokens = signTokens(String(user._id), user.role);
    const { passwordHash: _ph, __v, ...safe } = user.toObject();
    void _ph;
    void __v;
    ok(res, { user: safe, ...tokens }, 201);
  }),
);

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

router.post(
  '/login',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await UserModel.findOne({ email: body.email }).select('+passwordHash');
    if (!user) throw ApiError.unauthorized('No account found with that email.');
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) throw ApiError.unauthorized('Incorrect password.');

    user.lastLogin = new Date();
    await user.save();

    const { passwordHash: _ph, __v, ...safe } = user.toObject();
    void _ph;
    void __v;
    ok(res, { user: safe, ...signTokens(String(user._id), user.role) });
  }),
);

router.get(
  '/me',
  verifyAccessToken,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await UserModel.findById(req.userId);
    if (!user) throw ApiError.unauthorized();
    ok(res, { user });
  }),
);

export default router;