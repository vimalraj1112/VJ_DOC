import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

/**
 * A signature request: one stored PDF awaiting a signer's typed signature.
 * The URL-safe `token` is the secret — whoever holds it can sign the document,
 * so it must only ever be shared with the intended recipient.
 */
const signatureRequestSchema = new Schema(
  {
    /** Opaque bearer token; the signing link is `${CLIENT_URL}/s/${token}`. */
    token: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    /** User-facing title shown on the signer's page. */
    documentTitle: { type: String, required: true },
    /** Addressed to this person (optional). */
    signerName: { type: String, default: null },
    /** For reference only — the server never sends email. */
    signerEmail: { type: String, default: null },

    /** The PDF awaiting a signature, held in the storage driver. */
    storageKey: { type: String, required: true, unique: true },
    fileName: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ['PENDING', 'SIGNED', 'CANCELLED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
    signedAt: { type: Date, default: null },

    clientFingerprint: { type: String, default: null },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        // Internal storage keys never leave the server.
        delete ret.storageKey;
        delete ret.__v;
        return ret;
      },
    },
  },
);

signatureRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

export type SignatureRequestDoc = HydratedDocument<InferSchemaType<typeof signatureRequestSchema>>;
export const SignatureRequestModel = model('SignatureRequest', signatureRequestSchema);