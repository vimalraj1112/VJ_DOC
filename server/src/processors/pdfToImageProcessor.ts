import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import archiver from 'archiver';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ApiError, ERROR_CODES } from '../utils/ApiError.js';
import type { Processor, ProcessorContext, ProcessorInput, ProcessorResult } from './types.js';

interface PdfToImageOptions {
  mode: 'all' | 'selected';
  pages: number[];
  format: 'jpg' | 'png' | 'webp';
  quality: number; // 1–100
  scale: number; // output pixel density multiplier (~2 ≈ 144 DPI)
}

const require = createRequire(import.meta.url);
// Let pdfjs load the built-in standard fonts instead of warning per glyph.
const STANDARD_FONT_DATA_URL =
  join(dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts') + '/';

// pdfjs needs a real file:// URL (not a bare Windows path) for its fake worker.
const pdfjsRoot = dirname(require.resolve('pdfjs-dist/package.json'));
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
  join(pdfjsRoot, 'legacy', 'build', 'pdf.worker.mjs'),
).href;

export const pdfToImageProcessor: Processor = async (ctx) => {
  const options = normalizeOptions(ctx.options);
  if (ctx.inputs.length !== 1) {
    throw ApiError.badRequest('PDF to image expects exactly one PDF input.');
  }
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

  const totalPages = document.numPages;
  const indices = resolvePages(totalPages, options);

  const outputs: ProcessorResult['outputs'] = [];
  const rendered: Array<{ buffer: Buffer; filename: string }> = [];

  for (let n = 0; n < indices.length; n++) {
    assertActive(ctx);
    const pageIndex = indices[n];
    const page = await document.getPage(pageIndex);
    const viewport = page.getViewport({ scale: options.scale });
    const canvas = createCanvas(Math.max(1, Math.round(viewport.width)), Math.max(1, Math.round(viewport.height)));
    // The 2d context is a DOMCanvas-compatible surface; pdfjs only needs the
    // standard WebGL/2D method surface, which @napi-rs/canvas provides.
    const context = canvas.getContext('2d') as Parameters<typeof page.render>[0]['canvasContext'];

    try {
      await page.render({ canvasContext: context, viewport }).promise;
    } catch (error) {
      page.cleanup();
      throw new ApiError(422, ERROR_CODES.PROCESSING_FAILED, `Could not render page ${pageIndex}.`, {
        cause: (error as Error).message,
      });
    }

    const [ext] =
      options.format === 'jpg'
        ? ['jpg' as const]
        : options.format === 'png'
          ? ['png' as const]
          : ['webp' as const];

    const buffer =
      options.format === 'png'
        ? Buffer.from(await canvas.encode('png'))
        : Buffer.from(await canvas.encode(options.format === 'jpg' ? 'jpeg' : 'webp', options.quality));

    const base = cleanName(input.name);
    rendered.push({ buffer, filename: multiFileName(base, pageIndex, totalPages, options, ext) });
    page.cleanup();

    ctx.onProgress({
      percent: Math.round(((indices.length <= 1 ? n + 1 : n + 1) / Math.max(indices.length, 1)) * 90),
      stage: `Rendering page ${pageIndex + 1} of ${totalPages}`,
    });
  }

  await document.destroy();
  ctx.onProgress({ percent: 94, stage: 'Packing output' });

  // Single page => plain image. Multiple pages => a ZIP archive.
  if (rendered.length === 1) {
    const only = rendered[0];
    outputs.push({
      buffer: only.buffer,
      filename: singleFileName(input.name, options),
      mimeType: only.filename.endsWith('.png') ? 'image/png' : only.filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
      ext: only.filename.slice(only.filename.lastIndexOf('.')),
      pages: 1,
    });
  } else {
    const zipBuffer = await buildZip(rendered);
    outputs.push({
      buffer: zipBuffer,
      filename: `${cleanName(input.name)}-pages.zip`,
      mimeType: 'application/zip',
      ext: '.zip',
      pages: rendered.length,
    });
  }

  ctx.onProgress({ percent: 100, stage: 'Ready' });
  return { outputs };
};

function resolvePages(totalPages: number, options: PdfToImageOptions): number[] {
  if (options.mode === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const set = new Set<number>();
  for (const p of options.pages) {
    const idx = Number(p);
    if (!Number.isInteger(idx) || idx < 1 || idx > totalPages) {
      throw ApiError.badRequest(`Invalid page number: ${p}`);
    }
    set.add(idx);
  }
  if (set.size === 0) throw ApiError.badRequest('No pages selected.');
  return [...set].sort((a, b) => a - b);
}

function normalizeOptions(raw: Record<string, unknown>): PdfToImageOptions {
  const mode = raw.mode === 'selected' ? 'selected' : 'all';
  const format = (raw.format as PdfToImageOptions['format']) ?? 'jpg';
  const qualityRaw = Number(raw.quality ?? 80);
  const scaleBase = Number(raw.scale ?? 2);
  if (!['jpg', 'png', 'webp'].includes(format)) throw ApiError.badRequest(`Unknown format: "${format}"`);
  return {
    mode,
    pages: Array.isArray(raw.pages) ? raw.pages.map(Number) : [],
    format,
    quality: Math.min(100, Math.max(1, Math.round(qualityRaw))),
    scale: Math.round(Math.min(4, Math.max(1, scaleBase))),
  };
}

function cleanName(name: string): string {
  return name.replace(/\.pdf$/i, '') || 'document';
}

function singleFileName(inputName: string, options: PdfToImageOptions): string {
  const base = cleanName(inputName);
  return `${base}-image.${options.format === 'jpg' ? 'jpg' : options.format}`;
}

function multiFileName(base: string, pageIndex: number, totalPages: number, options: PdfToImageOptions, ext: string): string {
  const padded = String(totalPages).length > 1 ? String(pageIndex).padStart(String(totalPages).length, '0') : String(pageIndex);
  return `${base}-page-${padded}.${ext}`;
}

function buildZip(entries: Array<{ buffer: Buffer; filename: string }>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    for (const entry of entries) {
      archive.append(entry.buffer, { name: entry.filename });
    }
    void archive.finalize();
  });
}

function assertActive(ctx: ProcessorContext): void {
  if (ctx.signal.aborted) {
    throw new ApiError(409, ERROR_CODES.JOB_CANCELLED, 'Processing was cancelled.');
  }
}