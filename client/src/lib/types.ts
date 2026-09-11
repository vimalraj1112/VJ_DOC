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