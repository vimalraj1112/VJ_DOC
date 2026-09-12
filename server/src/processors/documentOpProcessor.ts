import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ApiError, ERROR_CODES } from '../utils/ApiError.js';
import { openPdf, assertActive } from './pdfLibProcessors.js';
import type { Processor, ProcessorContext, ProcessorOutput } from './types.js';

/**
 * documentOpProcessor: single-PDF tools switched by `options.op`.
 *   op 'extract-text'   → pull text from every page via pdfjs and emit a .txt.
 *   op 'remove-metadata'→ rebuild the document by copying its pages into a
 *                        fresh PDFDocument, so original title/author/producer
 *                        metadata is wiped (the new doc carries only pdf-lib
 *                        defaults). Field setters can't clear a value, so a
 *                        fresh document is the reliable way to scrub it.
 */

const require = createRequire(import.meta.url);
const STANDARD_FONT_DATA_URL =
  join(dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts') + '/';

const pdfjsRoot = dirname(require.resolve('pdfjs-dist/package.json'));
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
  join(pdfjsRoot, 'legacy', 'build', 'pdf.worker.mjs'),
).href;

export const documentOpProcessor: Processor = async (ctx) => {
  const op = String(ctx.options.op ?? 'extract-text');

  if (op === 'extract-text') return extractText(ctx);
  if (op === 'remove-metadata') return removeMetadata(ctx);

  throw ApiError.badRequest(`Unknown document operation "${op}".`);
};

async function extractText(ctx: ProcessorContext): Promise<{ outputs: ProcessorOutput[] }> {
  if (ctx.inputs.length !== 1) throw ApiError.badRequest('Extract text expects exactly one PDF.');
  const input = ctx.inputs[0];

  let document;
  try {
    document = await pdfjs.getDocument({
      data: new Uint8Array(input.buffer),
      standardFontDataUrl: STANDARD_FONT_DATA_URL,
      isEvalSupported: false,
    }).promise;
  } catch (error) {
    throw new ApiError(422, ERROR_CODES.PROCESSING_FAILED, 'This file is not a readable PDF.', {
      cause: (error as Error).message,
    });
  }

  const total = document.numPages;
  const chunks: string[] = [];

  for (let n = 0; n < total; n++) {
    assertActive(ctx);
    const page = await document.getPage(n + 1);
    try {
      const content = await page.getTextContent();
      let pageText = '';
      for (const item of content.items) {
        if ('str' in item && typeof item.str === 'string') pageText += item.str;
      }
      chunks.push(`--- Page ${n + 1} ---\n${pageText}`);
    } finally {
      page.cleanup();
    }
    ctx.onProgress({
      percent: Math.round(((n + 1) / total) * 95),
      stage: `Extracting page ${n + 1} of ${total}`,
    });
  }

  await document.destroy();
  ctx.onProgress({ percent: 100, stage: 'Ready' });

  return {
    outputs: [
      {
        buffer: Buffer.from(chunks.join('\n\n'), 'utf8'),
        filename: `${baseNameOf(input.name)}.txt`,
        mimeType: 'text/plain',
        ext: '.txt',
        pages: total,
      },
    ],
  };
}

async function removeMetadata(ctx: ProcessorContext): Promise<{ outputs: ProcessorOutput[] }> {
  if (ctx.inputs.length !== 1) throw ApiError.badRequest('Remove metadata expects exactly one PDF.');
  const input = ctx.inputs[0];

  const src = await openPdf(input.buffer, input.name);
  const out = await PDFDocument.create();
  const copies = await out.copyPages(src, src.getPageIndices());
  copies.forEach((page) => out.addPage(page));

  ctx.onProgress({ percent: 100, stage: 'Metadata removed' });

  const bytes = await out.save({ useObjectStreams: false });
  return {
    outputs: [
      {
        buffer: Buffer.from(bytes),
        filename: `${baseNameOf(input.name)}-clean.pdf`,
        mimeType: 'application/pdf',
        ext: '.pdf',
        pages: src.getPageCount(),
      },
    ],
  };
}

function baseNameOf(name: string): string {
  return name.replace(/\.pdf$/i, '') || 'document';
}