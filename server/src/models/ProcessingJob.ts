import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { JOB_STATUS } from '../config/constants.js';

/**
 * Every operation creates a job. Jobs are the unit the UI subscribes to over
 * Socket.IO (`job:progress`), and the unit the cleaner expires.
 */
const processingJobSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    /** Tool id, e.g. `png-to-pdf`. Matches the frontend tool registry. */
    operation: { type: String, required: true, index: true },

    /** Settings the user chose, stored verbatim for reproducibility. */
    options: { type: Schema.Types.Mixed, default: {} },

    inputFiles: [{ type: Schema.Types.ObjectId, ref: 'File' }],
    outputFiles: [{ type: Schema.Types.ObjectId, ref: 'File' }],

    status: {
      type: String,
      enum: Object.values(JOB_STATUS),
      default: JOB_STATUS.QUEUED,
      index: true,
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    stage: { type: String, default: 'Uploading' },

    /** User-safe failure text. Internal stack traces stay in the logs. */
    error: { type: String, default: null },
    errorCode: { type: String, default: null },

    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, index: true },

    /** Anonymous callers are metered by their network fingerprint. */
    clientFingerprint: { type: String, default: null, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.clientFingerprint;
        delete ret.__v;
        return ret;
      },
    },
  },
);

processingJobSchema.virtual('durationMs').get(function durationMs() {
  const started = this.startedAt as Date | null;
  const completed = this.completedAt as Date | null;
  if (!started || !completed) return null;
  return completed.getTime() - started.getTime();
});

export type ProcessingJobDoc = HydratedDocument<InferSchemaType<typeof processingJobSchema>>;
export const ProcessingJobModel = model('ProcessingJob', processingJobSchema);
