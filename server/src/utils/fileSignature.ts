/**
 * Magic-byte sniffing. The client's `file.type` and the file extension are
 * both attacker-controlled, so nothing is accepted until the bytes themselves
 * agree with what we expect.
 *
 * OOXML documents (DOCX / XLSX / PPTX) are ZIP archives, so plain head-byte
 * sniffing can only see `zip`. `classifyOffice` walks the ZIP central
 * directory (which lives at the end of the buffer) to tell them apart.
 */

export type SniffedKind = 'pdf' | 'png' | 'jpeg' | 'webp' | 'gif' | 'zip' | 'docx' | 'xlsx' | 'pptx' | 'unknown';

export type OfficeKind = 'docx' | 'xlsx' | 'pptx';

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

export const OFFICE_MIME_TYPES: Record<OfficeKind, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

const OFFICE_DIRECTORY_MARKERS: Array<{ kind: OfficeKind; markers: string[] }> = [
  { kind: 'docx', markers: ['word/document.xml'] },
  { kind: 'xlsx', markers: ['xl/workbook.xml'] },
  { kind: 'pptx', markers: ['ppt/presentation.xml'] },
];

/**
 * Walks the central directory of a ZIP/OOXML buffer and classifies it.
 * Returns null when the buffer is not a ZIP or matches no Office signature.
 */
export function classifyOffice(buffer: Buffer): OfficeKind | null {
  const names = listZipEntries(buffer);
  if (!names) return null;

  for (const { kind, markers } of OFFICE_DIRECTORY_MARKERS) {
    if (markers.some((m) => names.has(m))) return kind;
  }
  return null;
}

function listZipEntries(buffer: Buffer): Set<string> | null {
  const eocd = findEndOfCentralDirectory(buffer);
  if (eocd < 0) return null;

  const totalEntries = buffer.readUInt16LE(eocd + 10);
  const cdOffset = buffer.readUInt32LE(eocd + 16);
  const cdSize = buffer.readUInt32LE(eocd + 12);
  if (cdOffset + cdSize > buffer.length) return null;

  const names = new Set<string>();
  let cursor = cdOffset;
  const end = cdOffset + cdSize;

  while (cursor + 46 <= end) {
    // Central directory signature is PK\x01\x02.
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) break;

    const nameLen = buffer.readUInt16LE(cursor + 28);
    const extraLen = buffer.readUInt16LE(cursor + 30);
    const commentLen = buffer.readUInt16LE(cursor + 32);
    const nameStart = cursor + 46;
    const nameEnd = nameStart + nameLen;
    if (nameEnd > buffer.length) break;

    names.add(buffer.toString('utf8', nameStart, nameEnd));
    cursor = nameEnd + extraLen + commentLen;

    if (names.size > totalEntries) break;
  }

  return names;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  // EOCD signature PK\x05\x06 lives within the final 65791 bytes (64 KiB +
  // 64-byte max comment + 22-byte fixed record).
  const tail = Math.max(0, buffer.length - 65_791);
  for (let i = buffer.length - 22; i >= tail; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) return i;
  }
  return -1;
}
