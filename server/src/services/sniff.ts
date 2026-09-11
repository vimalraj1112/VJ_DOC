import fs from 'node:fs/promises';
import { sniffBuffer, type SniffedKind } from '../utils/fileSignature.js';

export interface SniffOutcome {
  kind: SniffedKind;
  mimeType: string;
  ext: string;
  label: string;
}

const KIND_LABELS: Record<SniffedKind, string> = {
  pdf: 'a PDF document',
  png: 'a PNG image',
  jpeg: 'a JPEG image',
  webp: 'a WEBP image',
  gif: 'a GIF image',
  zip: 'a ZIP archive',
  unknown: 'an unreadable file',
};

/** Read just enough bytes from an uploaded temp file to identify its type. */
export async function sniffer(file: { diskPath: string }): Promise<SniffOutcome> {
  let handle: fs.FileHandle | null = null;
  try {
    handle = await fs.open(file.diskPath, 'r');
    const buffer = Buffer.alloc(64 * 1024);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const head = buffer.subarray(0, bytesRead);
    const result = sniffBuffer(head);
    return { ...result, label: KIND_LABELS[result.kind] };
  } catch {
    return { kind: 'unknown', mimeType: 'application/octet-stream', ext: '', label: KIND_LABELS.unknown };
  } finally {
    await handle?.close().catch(() => undefined);
  }
}