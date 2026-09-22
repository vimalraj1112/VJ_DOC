import { randomBytes } from 'node:crypto';
import { getStorage } from '../storage/index.js';
import { SignatureRequestModel, type SignatureRequestDoc } from '../models/SignatureRequest.js';
import { sniffer } from './sniff.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { sanitizeDisplayName, stripExtension, createStorageKey } from '../utils/files.js';
import { signPdfWithTypedSignature, signedFileName } from '../utils/pdfSignature.js';

/**
 * Lives for the "Request Signature" tool.
 *
 * There is no email gateway (and no sign-up): creating a request stores a PDF
 * behind an unguessable token and returns a private link. Whoever receives the
 * link opens it, types their name, and the signed PDF is produced instantly
 * with a vector typed signature via pdf-lib.
 */

export interface CreateSignatureArgs {
  diskPath: string;
  originalName: string;
  size: number;
  options?: Record<string, unknown>;
  clientFingerprint?: string | null;
}

export interface SignatureUpload {
  request: SignatureRequestDoc;
  signingUrl: string;
}

export async function createSignatureRequest(args: CreateSignatureArgs): Promise<SignatureUpload> {
  const sniff = await sniffer({ diskPath: args.diskPath });
  if (sniff.kind !== 'pdf') {
    throw ApiError.unsupportedType(
      `"${args.originalName}" looks like ${sniff.label}. Signature requests accept one PDF.`,
    );
  }

  const options = args.options ?? {};
  const title = String(options.documentTitle ?? stripExtension(args.originalName))
    .trim()
    .slice(0, 80) || 'Document for signature';
  const signerName = trimOrNull(options.signerName, 80);
  const signerEmail = trimOrNull(options.signerEmail, 120);

  const storage = getStorage();
  const storageKey = createStorageKey('.pdf');
  const saved = await storage.saveFromPath(storageKey, args.diskPath, {
    contentType: 'application/pdf',
    metadata: { original: args.originalName },
  });

  const request = await SignatureRequestModel.create({
    token: randomBytes(24).toString('base64url'),
    userId: null,
    documentTitle: title,
    signerName,
    signerEmail,
    storageKey,
    fileName: sanitizeDisplayName(args.originalName),
    size: saved.size,
    status: 'PENDING',
    clientFingerprint: args.clientFingerprint ?? null,
    expiresAt: new Date(Date.now() + env.fileTtlHours * 60 * 60 * 1000),
  });

  return { request, signingUrl: `${env.clientUrl}/s/${request.token}` };
}

export interface SignedOutput {
  buffer: Buffer;
  filename: string;
  pages: number;
  request: SignatureRequestDoc;
}

export async function signSignatureRequest(token: string, name: string): Promise<SignedOutput> {
  const request = await SignatureRequestModel.findOne({ token });
  if (!request) throw ApiError.notFound('This signing link is invalid or has expired.');

  if (request.status === 'SIGNED') throw ApiError.badRequest('This document has already been signed.');
  if (request.status === 'CANCELLED') throw ApiError.badRequest('This signing request was cancelled.');

  if (request.expiresAt.getTime() <= Date.now()) {
    await expireRequest(request);
    throw ApiError.badRequest('This signing link has expired. Ask the sender to create a new request.');
  }

  const storage = getStorage();
  const buffer = await storage.read(request.storageKey);
  const signed = await signPdfWithTypedSignature(buffer, request.fileName, { name });

  request.status = 'SIGNED';
  request.signedAt = new Date();
  await request.save();

  return { buffer: signed.buffer, filename: signedFileName(request.fileName), pages: signed.pages, request };
}

export async function cancelSignatureRequest(token: string): Promise<SignatureRequestDoc> {
  const request = await SignatureRequestModel.findOne({ token });
  if (!request) throw ApiError.notFound('This signing link is invalid or has expired.');
  if (request.status !== 'PENDING') {
    throw ApiError.badRequest('Only a request that has not been signed yet can be cancelled.');
  }

  await getStorage()
    .delete(request.storageKey)
    .catch(() => undefined);
  request.status = 'CANCELLED';
  await request.save();
  return request;
}

/** Marks a request expired and frees its stored bytes. */
export async function expireRequest(request: SignatureRequestDoc): Promise<void> {
  await getStorage()
    .delete(request.storageKey)
    .catch(() => undefined);
  request.status = 'EXPIRED';
  await request.save().catch(() => undefined);
}

/** Public-facing shape safe to render on the signer's page. */
export function toPublicRequest(request: SignatureRequestDoc) {
  return {
    id: String(request._id),
    documentTitle: request.documentTitle,
    signerName: request.signerName,
    signerEmail: request.signerEmail,
    status: request.status,
    signedAt: request.signedAt,
    requestedAt: request.createdAt,
    expiresAt: request.expiresAt,
  };
}

function trimOrNull(raw: unknown, max: number): string | null {
  const value = String(raw ?? '').trim();
  return value ? value.slice(0, max) : null;
}