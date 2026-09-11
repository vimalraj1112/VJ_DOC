import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { FILE_STATUS } from '../config/constants.js';

/**
 * A single stored artefact — either an upload the user gave us or an output we
 * produced. Documents may be anonymous (`userId` null) because VJ_DOC works
 * without an account; ownership is only attached when someone is signed in.
 */
const fileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    /** Safe, user-facing name. Never used to build a path. */
    originalName: { type: String, required: true },

    /** Opaque internal key inside the storage driver. */
    storageKey: { type: String, required: true, unique: true },

    /** Sniffed server-side from magic bytes — never the client's claim. */
    mimeType: { type: String, required: true },
    kind: { type: String, enum: ['pdf', 'image', 'archive', 'other'], default: 'other' },

    size: { type: Number, required: true, min: 0 },
    pages: { type: Number, default: null },

    /** Set on outputs: which job produced this file. */
    jobId: { type: Schema.Types.ObjectId, ref: 'ProcessingJob', default: null, index: true },

    /** Opaque bearer token required by the download route. */
    downloadToken: { type: String, required: true, index: true },

    /** Hashed at rest; a download link cannot be reused to guess siblings. */
    shareTokenHash: { type: String, default: null },

    folderId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    isFavorite: { type: Boolean, default: false },

    status: { type: String, enum: Object.values(FILE_STATUS), default: FILE_STATUS.READY, index: true },

    /** Cleaner removes the blob and marks the doc EXPIRED once this passes. */
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        // Never leak internal storage keys over the wire.
        delete ret.storageKey;
        delete ret.downloadToken;
        delete ret.shareTokenHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Cleaner sweeps on this field; a TTL index also lets MongoDB reap stale rows.
fileSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

export type FileDoc = HydratedDocument<InferSchemaType<typeof fileSchema>>;
export const FileModel = model('File', fileSchema);
