import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

/**
 * VJ_DOC is anonymous-first: every tool works without an account. A User only
 * exists once someone opts into keeping their history (`soft sign-in`), which
 * is why nothing here is required to process a document.
 */
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: String, default: null },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER', index: true },
    plan: { type: String, enum: ['free', 'pro', 'business'], default: 'free', index: true },
    storageUsed: { type: Number, default: 0 },
    emailVerified: { type: Boolean, default: false },
    lastLogin: { type: Date, default: null },
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      emails: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;
export const UserModel = model('User', userSchema);
