import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ApiError, ERROR_CODES } from './ApiError.js';

/**
 * Shared pdfjs text extraction. Returns the document's text grouped into
 * visual lines (each render line becomes one string). Things called
 * "text-based PDFs" produce good results; scanned images produce nothing.
 */

const require = createRequire(import.meta.url);
const STANDARD_FONT_DATA_URL =
  join(dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts') + '/';

const pdfjsRoot = dirname(require.resolve('pdfjs-dist/package.json'));
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
  join(pdfjsRoot, 'legacy', 'build', 'pdf.worker.mjs'),
).href;

export interface TextExtractOptions {
  onProgress?: (percent: number, stage: string) => void;
}

export async function extractTextLines(
  buffer: Buffer,
  options: TextExtractOptions = {},
): Promise<string[]> {
  const lines = await extractPages(buffer, options);
  return lines.flatMap((p) => p.lines);
}

/** Per-page lines, which lets callers keep page layout (page breaks, etc.). */
export async function extractPages(
  buffer: Buffer,
  options: TextExtractOptions = {},
): Promise<Array<{ page: number; lines: string[] }>> {
  let document;
  try {
    document = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      standardFontDataUrl: STANDARD_FONT_DATA_URL,
      isEvalSupported: false,
    }).promise;
  } catch (error) {
    throw new ApiError(422, ERROR_CODES.PROCESSING_FAILED, 'This file is not a readable PDF.', {
      cause: (error as Error).message,
    });
  }

  const total = document.numPages;
  const pages: Array<{ page: number; lines: string[] }> = [];

  try {
    for (let n = 0; n < total; n++) {
      const page = await document.getPage(n + 1);
      try {
        const content = await page.getTextContent();
        pages.push({ page: n + 1, lines: groupIntoLines(content.items as unknown as TextItemLike[]) });
      } finally {
        page.cleanup();
      }
      options.onProgress?.(Math.round(((n + 1) / total) * 95), `Extracting page ${n + 1} of ${total}`);
    }
  } finally {
    await document.destroy();
  }

  return pages;
}

interface TextItemLike {
  str?: string;
  hasEOL?: boolean;
  transform?: number[];
}

function groupIntoLines(items: TextItemLike[]): string[] {
  const lines: string[] = [];
  let current: TextItemLike[] = [];
  let anchorY: number | null = null;

  for (const item of items) {
    if (!item.str || !item.transform) continue;
    const y = item.transform[5];

    if (anchorY === null || Math.abs(y - anchorY) < 4) {
      if (anchorY === null) anchorY = y;
      current.push(item);
    } else {
      lines.push(renderLine(current));
      current = [item];
      anchorY = y;
    }
    if (item.hasEOL && current.length) {
      lines.push(renderLine(current));
      current = [];
      anchorY = null;
    }
  }
  if (current.length) lines.push(renderLine(current));
  return lines.filter((l) => l.length > 0);
}

function renderLine(items: TextItemLike[]): string {
  const sortedSpans = items
    .sort((a, b) => (a.transform![4] ?? 0) - (b.transform![4] ?? 0))
    .map((i) => i.str ?? '');
  let text = '';
  for (const span of sortedSpans) {
    text += text && /\S$/.test(text) && /\S/.test(span) ? ` ${span}` : span;
  }
  return text.trim();
}