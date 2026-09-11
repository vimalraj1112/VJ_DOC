/**
 * Shared, framework-agnostic constants.
 * Anything the API exposes to the client should be defined here so the frontend
 * and backend never drift apart.
 */

export const JOB_STATUS = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export const FILE_STATUS = {
  PENDING: 'PENDING',
  READY: 'READY',
  EXPIRED: 'EXPIRED',
  DELETED: 'DELETED',
} as const;

export type FileStatus = (typeof FILE_STATUS)[keyof typeof FILE_STATUS];

export const SOCKET_EVENTS = {
  JOB_CREATED: 'job:created',
  JOB_PROGRESS: 'job:progress',
  JOB_COMPLETED: 'job:completed',
  JOB_FAILED: 'job:failed',
} as const;

export const SOCKET_ROOM = {
  job: (jobId: string) => `job:${jobId}`,
} as const;

/** Canonical page dimensions in PDF points (1pt = 1/72 inch). */
export const PAGE_SIZES = {
  A3: { width: 841.89, height: 1190.55 },
  A4: { width: 595.28, height: 841.89 },
  A5: { width: 419.53, height: 595.28 },
  LETTER: { width: 612, height: 792 },
  LEGAL: { width: 612, height: 1008 },
} as const;

export type NamedPageSize = keyof typeof PAGE_SIZES;

/** Margin presets in PDF points. */
export const MARGIN_PRESETS = {
  none: 0,
  small: 18,
  medium: 36,
  large: 54,
} as const;

export type MarginPreset = keyof typeof MARGIN_PRESETS;

export const IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'] as const;

export const PDF_MIME_TYPE = 'application/pdf';

/** Human readable progress stage labels, surfaced verbatim in the UI. */
export const PROGRESS_STAGES = [
  { at: 0, label: 'Uploading' },
  { at: 20, label: 'Analyzing' },
  { at: 45, label: 'Processing pages' },
  { at: 70, label: 'Optimizing' },
  { at: 90, label: 'Finalizing' },
  { at: 100, label: 'Ready' },
] as const;

export function stageLabelFor(progress: number): string {
  let label: string = PROGRESS_STAGES[0].label;
  for (const stage of PROGRESS_STAGES) {
    if (progress >= stage.at) label = stage.label;
  }
  return label;
}
