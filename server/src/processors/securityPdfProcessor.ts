import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { PDFDocument, rgb } from 'pdf-lib';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ApiError, ERROR_CODES } from '../utils/ApiError.js';
import { openPdf, baseName, assertActive } from './pdfLibProcessors.js';
import { convertWithLibreOffice, pdfEncryptionFilterParams } from '../utils/office.js';
import type { Processor, ProcessorContext, ProcessorOutput } from './types.js';

/**
 * Security processor: one PDF, three operations selected by `options.op`.
 *   op 'protect' → encrypt the document with a password. pdf-lib cannot write
 *                  encrypted PDFs, so we re-export the PDF through LibreOffice
 *                  with the PDF export's EncryptFile option (AES-256). Requires
 *                  LibreOffice to be installed.
 *   op 'unlock'  → remove protection. pdf-lib cannot decrypt streams, so we
 *                  render every page (via pdfjs, optionally with the user's
 *                  password) and rebuild a fresh, unprotected PDF. The output
 *                  is page-accurate but rasterized (text is no longer
 *                  selectable) — a safe, honest interpretation of "unlock".
 *   op 'redact'  → visually black out any text matching `options.terms`
 *                  (comma separated). Text boxes are located via pdfjs text
 *                  items and covered with opaque rectangles.
 */

const require = createRequire(import.meta.url);
const STANDARD_FONT_DATA_URL =
  join(dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts') + '/';

const pdfjsRoot = dirname(require.resolve('pdfjs-dist/package.json'));
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
  join(pdfjsRoot, 'legacy', 'build', 'pdf.worker.mjs'),
).href;

export const securityPdfProcessor: Processor = async (ctx) => {
  if (ctx.inputs.length !== 1) throw ApiError.badRequest('This tool expects exactly one PDF.');
  const op = String(ctx.options.op ?? 'protect');

  if (op === 'protect') return protectPdf(ctx);
  if (op === 'unlock') return unlockPdf(ctx);
  if (op === 'redact') return redactPdf(ctx);

  throw ApiError.badRequest(`Unknown security operation "${op}".`);
};

async function protectPdf(ctx: ProcessorContext): Promise<{ outputs: ProcessorOutput[] }> {
  const input = ctx.inputs[0];
  const password = String(ctx.options.password ?? '');
  if (password.length < 4) {
    throw ApiError.badRequest('Choose a password of at least 4 characters.');
  }

  const src = await openPdf(input.buffer, input.name);
  const total = src.getPageCount();

  ctx.onProgress({ percent: 15, stage: 'Encrypting document' });
  const { buffer: bytes } = await convertWithLibreOffice({
    buffer: input.buffer,
    originalName: input.name,
    outputExt: 'pdf',
    // PDF imports into LibreOffice as a Draw document, so draw_pdf_Export is
    // the correct export filter here.
    filter: 'draw_pdf_Export',
    filterParams: pdfEncryptionFilterParams(password),
  });

  ctx.onProgress({ percent: 95, stage: 'Finalizing document' });
  ctx.onProgress({ percent: 100, stage: 'Ready' });

  return {
    outputs: [
      {
        buffer: bytes,
        filename: `${baseName(input.name)}-protected.pdf`,
        mimeType: 'application/pdf',
        ext: '.pdf',
        pages: total,
      },
    ],
  };
}

async function unlockPdf(ctx: ProcessorContext): Promise<{ outputs: ProcessorOutput[] }> {
  const input = ctx.inputs[0];
  const password = String(ctx.options.password ?? '') || undefined;

  let document;
  try {
    document = await pdfjs.getDocument({
      data: new Uint8Array(input.buffer),
      password,
      standardFontDataUrl: STANDARD_FONT_DATA_URL,
      isEvalSupported: false,
    }).promise;
  } catch (error) {
    const message =
      (error as Error)?.name === 'PasswordException'
        ? 'This PDF needs a password. Enter the password you want to remove.'
        : 'This file is not a readable PDF.';
    throw new ApiError(422, ERROR_CODES.PROCESSING_FAILED, message, {
      cause: (error as Error).message,
    });
  }

  const total = document.numPages;
  const out = await PDFDocument.create();

  for (let n = 0; n < total; n++) {
    assertActive(ctx);
    const page = await document.getPage(n + 1);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = createCanvas(Math.max(1, Math.round(viewport.width)), Math.max(1, Math.round(viewport.height)));
    const context = canvas.getContext('2d') as Parameters<typeof page.render>[0]['canvasContext'];

    try {
      await page.render({ canvasContext: context, viewport }).promise;
    } finally {
      page.cleanup();
    }

    const png = await canvas.encode('png');
    const image = await out.embedPng(png);
    const pageSize = out.addPage([viewport.width, viewport.height]);
    pageSize.drawImage(image, {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
    });

    ctx.onProgress({ percent: Math.round(((n + 1) / total) * 88), stage: `Rendering page ${n + 1} of ${total}` });
  }

  await document.destroy();
  ctx.onProgress({ percent: 94, stage: 'Rebuilding document' });
  const bytes = await out.save({ useObjectStreams: false });
  ctx.onProgress({ percent: 100, stage: 'Ready' });

  return {
    outputs: [
      {
        buffer: Buffer.from(bytes),
        filename: `${baseName(input.name)}-unlocked.pdf`,
        mimeType: 'application/pdf',
        ext: '.pdf',
        pages: total,
      },
    ],
  };
}

interface RedactBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function redactPdf(ctx: ProcessorContext): Promise<{ outputs: ProcessorOutput[] }> {
  const input = ctx.inputs[0];
  const terms = parseTerms(ctx.options.terms);
  if (terms.length === 0) {
    throw ApiError.badRequest('Enter at least one term to redact (comma separated).');
  }

  const src = await openPdf(input.buffer, input.name);
  const total = src.getPageCount();

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

  for (let n = 0; n < total; n++) {
    assertActive(ctx);
    const pdfPage = src.getPage(n);
    const pdfjsPage = await document.getPage(n + 1);

    try {
      const content = await pdfjsPage.getTextContent();
      const boxes: RedactBox[] = [];
      for (const item of content.items) {
        if ('str' in item && typeof item.str === 'string' && item.str.trim()) {
          const found = terms.some((term) => item.str.toLowerCase().includes(term));
          if (found) boxes.push(bboxOf(item));
        }
      }

      for (const box of boxes) {
        pdfPage.drawRectangle({
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          color: rgb(0, 0, 0),
        });
      }
    } finally {
      pdfjsPage.cleanup();
    }

    ctx.onProgress({ percent: Math.round(((n + 1) / total) * 92), stage: `Redacting page ${n + 1} of ${total}` });
  }

  await document.destroy();
  ctx.onProgress({ percent: 96, stage: 'Finalizing document' });
  const bytes = await src.save({ useObjectStreams: true });
  ctx.onProgress({ percent: 100, stage: 'Ready' });

  return {
    outputs: [
      {
        buffer: Buffer.from(bytes),
        filename: `${baseName(input.name)}-redacted.pdf`,
        mimeType: 'application/pdf',
        ext: '.pdf',
        pages: total,
      },
    ],
  };
}

/** Converts a pdfjs text item's transform into an approximate page-space rect. */
function bboxOf(item: { transform: number[]; width: number; height: number; str?: string }): RedactBox {
  const [a, b, _c, _d, e, f] = item.transform;
  const scale = Math.hypot(a, b) || 1;
  const fontSize = item.height || scale;
  const width = Math.abs(item.width * scale) + 3;
  const height = Math.max(fontSize, scale) + 6;
  return { x: e - 1.5, y: f - 1.5, width, height };
}

function parseTerms(raw: unknown): string[] {
  return String(raw ?? '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
}