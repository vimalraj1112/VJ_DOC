/** Wire types shared across the app, shaped by the server's response envelopes. */

export interface FileResult {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  pages: number | null;
  kind: 'pdf' | 'image' | 'archive' | 'other';
  favorite: boolean;
  downloadToken: string;
  expiresAt: string;
}

export interface JobResult {
  id: string;
  operation: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  stage: string;
  outputFiles: string[];
}

/** GET /jobs/:jobId — adds the deserialized output files for downloads. */
export interface JobDetail extends JobResult {
  files: FileResult[];
  error?: string | null;
}

export interface ProcessResponse {
  job: JobResult;
  outputFiles: FileResult[];
}

export type JobStatus = JobResult['status'];

export function fileDownloadUrl(file: FileResult): string {
  return `/api/v1/files/${file.id}/download?token=${file.downloadToken}`;
}

export function fileViewUrl(file: FileResult): string {
  return `/api/v1/files/${file.id}/view?token=${file.downloadToken}`;
}

export function fileDownloadName(file: FileResult): string {
  return file.name;
}

/** Public data for a signature request (shown on the signer's page). */
export interface SignatureRequestView {
  id: string;
  documentTitle: string;
  signerName: string | null;
  signerEmail: string | null;
  status: 'PENDING' | 'SIGNED' | 'CANCELLED' | 'EXPIRED';
  signedAt: string | null;
  requestedAt: string;
  expiresAt: string;
}

/** What the requester receives after creating a signature request. */
export interface SignatureRequestCreated extends SignatureRequestView {
  token: string;
  signingUrl: string;
}