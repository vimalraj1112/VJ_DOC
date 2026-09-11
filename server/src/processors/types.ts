import type { FileDoc } from '../models/File.js';

/** A fully-validated, in-memory input to a processor. */
export interface ProcessorInput {
  fileId: string;
  buffer: Buffer;
  /** Absolute path on disk when the driver exposes one (avoids re-reading). */
  diskPath: string | null;
  name: string;
  mimeType: string;
}

/** One output artefact a processor produces. Delivered as a buffer in memory. */
export interface ProcessorOutput {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  ext: string;
  pages: number | null;
}

export interface ProcessorProgress {
  /** 0–100 whole number. */
  percent: number;
  /** Human-readable stage shown verbatim in the UI (e.g. "Processing pages"). */
  stage: string;
}

export interface ProcessorContext {
  toolId: string;
  inputs: ProcessorInput[];
  options: Record<string, unknown>;
  onProgress: (p: ProcessorProgress) => void;
  signal: AbortSignal;
}

export interface ProcessorResult {
  outputs: ProcessorOutput[];
}

export type Processor<TOptions = Record<string, unknown>> = (
  ctx: ProcessorContext,
) => Promise<ProcessorResult>;

/** Which input kinds a tool accepts, sniffed from magic bytes on the server. */
export type AcceptedKind = 'pdf' | 'png' | 'jpeg' | 'webp';

export interface ToolProcessingSpec {
  id: string;
  accepts: AcceptedKind[];
  minFiles: number;
  maxFiles: number;
  maxBufferBytes: number | null;
  /** Describes what the tool emits so the API can shape the response. */
  output: { mimeType: string; ext: string; singleOutput: boolean };
}