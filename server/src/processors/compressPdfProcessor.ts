import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFDocument } from 'pdf-lib';
import { baseName, assertActive } from './pdfLibProcessors.js';
import { ApiError, ERROR_CODES } from '../utils/ApiError.js';
import type { Processor } from './types.js';

/**
 * Compress: rebuilds a PDF from rasterised pages so embedded images are
 * re-encoded as leaner JPEGs. This delivers real size reduction for
 * image-heavy documents (scans, photos) while keeping text pages readable.
 * Mirrors the pdfjs + @napi-rs/canvas setup proven in pdfToImageProcessor.
 */

const require = createRequire(import.meta.url);
const STANDARD_FONT_DATA_URL =
  join(dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts') + '/';

const pdfjsRoot = dirname(require.resolve('pdfjs-dist/package.json'));
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
  join(pdfjsRoot, 'legacy', 'build', 'pdf.worker.mjs'),
).href;

// Fixed render density: lower than the default PDF→image scale so output is
// meaningfully smaller, but high enough that text stays crisp.
const RENDER_SCALE = 1.5;

export const compressPdfProcessor: Processor = async (ctx) => {
  if (ctx.inputs.length !== 1) throw ApiError.badRequest('Compress expects exactly one PDF.');
  const input = ctx.inputs[0];
  const quality = Math.min(95, Math.max(20, Math.round(Number(ctx.options.quality ?? 60))));

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
  const out = await PDFDocument.create();
  const originals: { width: number; height: number }[] = [];

  for (let n = 0; n < totalPages; n++) {
    assertActive(ctx);
    const page = await document.getPage(n + 1);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const width = Math.max(1, Math.round(viewport.width));
    const height = Math.max(1, Math.round(viewport.height));
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d') as Parameters<typeof page.render>[0]['canvasContext'];

    await page.render({ canvasContext: context, viewport }).promise;

    // Encode through sharp: pdf-lib's embedJpg requires a standard baseline
    // JPEG, which sharp reliably produces from the raw RGBA canvas pixels.
    const pixels = context.getImageData(0, 0, width, height).data;
    const jpeg = await sharp(pixels, { raw: { width, height, channels: 4 } })
      .jpeg({ quality, chromaSubsampling: '4:4:4' })
      .toBuffer();

    const image = await out.embedJpg(jpeg);
    const pdfPage = out.addPage([width, height]);
    pdfPage.drawImage(image, { x: 0, y: 0, width, height });

    originals.push({ width, height });
    page.cleanup();
    ctx.onProgress({
      percent: Math.round(((n + 1) / totalPages) * 90),
      stage: `Compressing page ${n + 1} of ${totalPages}`,
    });
  }

  await document.destroy();

  ctx.onProgress({ percent: 94, stage: 'Saving output' });
  const bytes = await out.save({ useObjectStreams: false });

  const before = input.buffer.length;
  const after = bytes.length;
  const savedPct = before > 0 && after > 0 ? 100 - Math.round((after / before) * 100) : 0;

  ctx.onProgress({
    percent: 100,
    stage: savedPct > 0 ? `Saved ${savedPct}% smaller` : 'Compressed',
  });

  return {
    outputs: [
      {
        buffer: Buffer.from(bytes),
        filename: `${baseName(input.name)}-compressed.pdf`,
        mimeType: 'application/pdf',
        ext: '.pdf',
        pages: totalPages,
      },
    ],
  };
};