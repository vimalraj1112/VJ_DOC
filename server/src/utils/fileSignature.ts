/**
 * Magic-byte sniffing. The client's `file.type` and the file extension are
 * both attacker-controlled, so nothing is accepted until the bytes themselves
 * agree with what we expect.
 */

export type SniffedKind = 'pdf' | 'png' | 'jpeg' | 'webp' | 'gif' | 'zip' | 'unknown';

export interface SniffResult {
  kind: SniffedKind;
  mimeType: string;
  ext: string;
}

const SIGNATURES: Array<{ kind: SniffedKind; mimeType: string; ext: string; test: (b: Buffer) => boolean }> = [
  {
    kind: 'pdf',
    mimeType: 'application/pdf',
    ext: '.pdf',
    test: (b) => b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  },
  {
    kind: 'png',
    mimeType: 'image/png',
    ext: '.png',
    test: (b) =>
      b.length > 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    kind: 'jpeg',
    mimeType: 'image/jpeg',
    ext: '.jpg',
    test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    kind: 'webp',
    mimeType: 'image/webp',
    ext: '.webp',
    test: (b) =>
      b.length > 12 &&
      b.toString('ascii', 0, 4) === 'RIFF' &&
      b.toString('ascii', 8, 12) === 'WEBP',
  },
  {
    kind: 'gif',
    mimeType: 'image/gif',
    ext: '.gif',
    test: (b) => b.length > 6 && b.toString('ascii', 0, 3) === 'GIF',
  },
  {
    kind: 'zip',
    mimeType: 'application/zip',
    ext: '.zip',
    test: (b) => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07),
  },
];

export function sniffBuffer(buffer: Buffer): SniffResult {
  for (const sig of SIGNATURES) {
    if (sig.test(buffer)) {
      return { kind: sig.kind, mimeType: sig.mimeType, ext: sig.ext };
    }
  }
  return { kind: 'unknown', mimeType: 'application/octet-stream', ext: '' };
}
