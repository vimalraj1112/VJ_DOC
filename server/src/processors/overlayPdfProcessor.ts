import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont } from 'pdf-lib';
import { baseName, openPdf, assertActive } from './pdfLibProcessors.js';
import { ApiError } from '../utils/ApiError.js';
import type { Processor } from './types.js';

/**
 * Overlay: stamps content onto a single PDF using pure pdf-lib text drawing.
 * One processor, three operations selected by `options.op`:
 *   - 'watermark'    → a semi-transparent label (tiled across the page)
 *   - 'pageNumber'   → a running page number in a chosen corner
 *   - 'signature'    → a typed signature near the bottom of the last page
 */

type OverlayOp = 'watermark' | 'pageNumber' | 'signature';

const COORDS: Record<string, (pageW: number, pageH: number) => { x: number; y: number }> = {
  'top-left': (w, h) => ({ x: 24, y: h - 40 }),
  'top-right': (w, h) => ({ x: w, y: h - 40 }),
  'bottom-left': (w, h) => ({ x: 24, y: 30 }),
  'bottom-right': (w, h) => ({ x: w, y: 30 }),
  'center': (w, h) => ({ x: w / 2, y: h / 2 }),
};

export const overlayPdfProcessor: Processor = async (ctx) => {
  if (ctx.inputs.length !== 1) throw ApiError.badRequest('This tool expects exactly one PDF.');
  const input = ctx.inputs[0];
  const op = resolveOp(ctx.options.op);
  const src = await openPdf(input.buffer, input.name);
  const totalPages = src.getPageCount();

  ctx.onProgress({ percent: 8, stage: 'Analyzing document' });

  const helvetica = await src.embedFont(StandardFonts.Helvetica);
  const italic = await src.embedFont(StandardFonts.TimesRomanItalic);
  const fonts = { helvetica, italic };

  switch (op) {
    case 'watermark':
      stampWatermark(ctx, src, totalPages, fonts);
      break;
    case 'pageNumber':
      stampPageNumbers(ctx, src, totalPages, fonts);
      break;
    case 'signature':
      stampSignature(ctx, src, totalPages, fonts);
      break;
  }

  ctx.onProgress({ percent: 94, stage: 'Finalizing document' });
  const bytes = await src.save({ useObjectStreams: true });
  ctx.onProgress({ percent: 100, stage: 'Ready' });

  return {
    outputs: [
      {
        buffer: Buffer.from(bytes),
        filename: `${baseName(input.name)}-${op === 'pageNumber' ? 'numbered' : op === 'watermark' ? 'watermarked' : 'signed'}.pdf`,
        mimeType: 'application/pdf',
        ext: '.pdf',
        pages: totalPages,
      },
    ],
  };
};

type Fonts = { helvetica: PDFFont; italic: PDFFont };

function stampWatermark(
  ctx: Parameters<Processor>[0],
  src: PDFDocument,
  totalPages: number,
  fonts: Fonts,
): void {
  const text = String(ctx.options.text ?? '').trim();
  if (!text) throw ApiError.badRequest('Enter the watermark text.');
  const size = Math.max(12, Math.min(120, Number(ctx.options.size ?? 48)));
  const opacity = Math.min(0.9, Math.max(0.05, Number(ctx.options.opacity ?? 0.24)));
  const { helvetica } = fonts;

  for (let i = 0; i < totalPages; i++) {
    assertActive(ctx);
    const page = src.getPage(i);
    const { width, height } = page.getSize();
    const big = Math.ceil(width / (size * 1.4));
    const cols = Math.max(1, Math.ceil(width / (size * 4.2)));
    const rows = Math.max(1, Math.ceil(height / (size * 6)));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = (c + 0.5) * (width / cols);
        const cy = (r + 0.5) * (height / rows);
        page.drawText(text, {
          x: cx - big, y: cy,
          size,
          font: helvetica,
          color: rgb(0.4, 0.4, 0.4),
          opacity,
          rotate: degrees(45),
        });
      }
    }
    ctx.onProgress({
      percent: 8 + Math.round(((i + 1) / totalPages) * 82),
      stage: `Watermarking page ${i + 1} of ${totalPages}`,
    });
  }
}

function stampPageNumbers(
  ctx: Parameters<Processor>[0],
  src: PDFDocument,
  totalPages: number,
  fonts: Fonts,
): void {
  const start = Math.max(0, Math.floor(Number(ctx.options.start ?? 1)));
  const position = String(ctx.options.position ?? 'bottom-right');
  const corner = COORDS[position] ?? COORDS['bottom-right'];
  const { helvetica } = fonts;
  const size = 12;

  for (let i = 0; i < totalPages; i++) {
    assertActive(ctx);
    const page = src.getPage(i);
    const { width, height } = page.getSize();
    const label = String(start + i);
    const textWidth = helvetica.widthOfTextAtSize(label, size);
    const { x, y } = corner(width, height);
    const anchor = x + (x > width / 2 ? -textWidth - 4 : 4);

    page.drawText(label, { x: anchor, y, size, font: helvetica, color: rgb(0.35, 0.35, 0.35) });

    ctx.onProgress({
      percent: 8 + Math.round(((i + 1) / totalPages) * 82),
      stage: `Numbering page ${i + 1} of ${totalPages}`,
    });
  }
}

function stampSignature(
  ctx: Parameters<Processor>[0],
  src: PDFDocument,
  totalPages: number,
  fonts: Fonts,
): void {
  const text = String(ctx.options.text ?? '').trim();
  if (!text) throw ApiError.badRequest('Type a name or signature.');
  const { italic } = fonts;
  const page = src.getPage(totalPages - 1);
  const { width, height } = page.getSize();
  const size = 28;
  const textWidth = italic.widthOfTextAtSize(text, size);

  page.drawText(text, {
    x: Math.max(24, width - textWidth - 48),
    y: 48,
    size,
    font: italic,
    color: rgb(0.1, 0.1, 0.2),
  });
  ctx.onProgress({ percent: 92, stage: 'Placing signature' });
}

function resolveOp(raw: unknown): OverlayOp {
  const value = String(raw ?? '');
  if (!['watermark', 'pageNumber', 'signature'].includes(value)) {
    throw ApiError.badRequest(`Unknown overlay operation: "${value}"`);
  }
  return value as OverlayOp;
}