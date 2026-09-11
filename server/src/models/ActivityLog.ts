import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

/** Append-only record of what happened, used for analytics and the audit trail. */
const activityLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    action: { type: String, required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'ProcessingJob', default: null },
    fileId: { type: Schema.Types.ObjectId, ref: 'File', default: null },
    meta: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true },
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export type ActivityLogDoc = HydratedDocument<InferSchemaType<typeof activityLogSchema>>;
export const ActivityLogModel = model('ActivityLog', activityLogSchema);
