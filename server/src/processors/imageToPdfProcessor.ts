import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { PAGE_SIZES, MARGIN_PRESETS, type NamedPageSize, type MarginPreset } from '../config/constants.js';
import { ApiError, ERROR_CODES } from '../utils/ApiError.js';
import type { Processor, ProcessorContext, ProcessorInput, ProcessorResult } from './types.js';

interface ImageToPdfOptions {
  pageSize: NamedPageSize | 'original';
  orientation: 'portrait' | 'landscape' | 'auto';
  margin: MarginPreset;
  imageFit: 'fit' | 'fill' | 'original';
  quality: 'standard' | 'high' | 'maximum';
  /** Per-input clockwise rotation in degrees (0 | 90 | 180 | 270). */
  rotate: number[];
}

const QUALITY_JPEG: Record<ImageToPdfOptions['quality'], number> = {
  standard: 68,
  high: 82,
  maximum: 94,
};

export const imageToPdfProcessor: Processor = async (ctx) => {
  const options = normalizeOptions(ctx.options);
  const pdf = await PDFDocument.create();
  const dpi = options.pageSize === 'original' ? 144 : 96;

  const total = ctx.inputs.length;
  for (let idx = 0; idx < total; idx++) {
    assertActive(ctx);
    const input = ctx.inputs[idx];
    const rotation = options.rotate[idx] ?? 0;

    const rendered = await renderToJpeg(input, rotation, QUALITY_JPEG[options.quality]);
    const { width, height } = rendered;

    assertActive(ctx);
    const { pageWidth, pageHeight } = resolvePageSize(dpToPts(width), dpToPts(height), width, height, options, dpi);

    const page = pdf.addPage([pageWidth, pageHeight]);
    const image = await pdf.embedJpg(rendered.jpeg);

    if (options.imageFit === 'original') {
      // Natural size, centered. Oversized pixels are clipped by the page bounds.
      const drawW = Math.min(width, pageWidth);
      const drawH = (width / height) * drawW;
      const x = (pageWidth - drawW) / 2;
      const y = (pageHeight - drawH) / 2;
      page.drawImage(image, { x, y, width: drawW, height: drawH });
    } else {
      const m = MARGIN_PRESETS[options.margin];
      const boxW = Math.max(1, pageWidth - m * 2);
      const boxH = Math.max(1, pageHeight - m * 2);

      if (options.imageFit === 'fill') {
        // Cover the box: scale-to-fill then centre, cropping the overflow.
        const scale = Math.max(boxW / width, boxH / height);
        const drawW = width * scale;
        const drawH = height * scale;
        const x = (pageWidth - drawW) / 2;
        const y = (pageHeight - drawH) / 2;
        page.drawImage(image, { x, y, width: drawW, height: drawH });
      } else {
        // Contain: fit entirely inside the box, preserving aspect ratio.
        const scale = Math.min(boxW / width, boxH / height);
        const drawW = width * scale;
        const drawH = height * scale;
        const x = (pageWidth - drawW) / 2;
        const y = (pageHeight - drawH) / 2;
        page.drawImage(image, { x, y, width: drawW, height: drawH });
      }
    }

    ctx.onProgress({
      percent: Math.round(((idx + 1) / total) * 88),
      stage: total === 1 ? 'Forging page 1' : `Forging page ${idx + 1} of ${total}`,
    });
  }

  ctx.onProgress({ percent: 92, stage: 'Finalizing document' });
  const bytes = await pdf.save({ useObjectStreams: true });
  ctx.onProgress({ percent: 100, stage: 'Ready' });

  const name = ctx.inputs.length === 1 ? cleanName(ctx.inputs[0].name) : 'images';
  return {
    outputs: [
      {
        buffer: Buffer.from(bytes),
        filename: `${name}.pdf`,
        mimeType: 'application/pdf',
        ext: '.pdf',
        pages: ctx.inputs.length,
      },
    ],
  };
};

function normalizeOptions(raw: Record<string, unknown>): ImageToPdfOptions {
  const pageSize = (raw.pageSize as ImageToPdfOptions['pageSize']) ?? 'A4';
  const orientation = (raw.orientation as ImageToPdfOptions['orientation']) ?? 'auto';
  const margin = (raw.margin as MarginPreset) ?? 'none';
  const imageFit = (raw.imageFit as ImageToPdfOptions['imageFit']) ?? 'fit';
  const quality = (raw.quality as ImageToPdfOptions['quality']) ?? 'standard';

  if (!(pageSize in PAGE_SIZES) && pageSize !== 'original') {
    throw ApiError.badRequest(`Unknown page size: "${pageSize}"`);
  }
  if (!['portrait', 'landscape', 'auto'].includes(orientation)) {
    throw ApiError.badRequest(`Unknown orientation: "${orientation}"`);
  }
  if (!(margin in MARGIN_PRESETS)) {
    throw ApiError.badRequest(`Unknown margin preset: "${margin}"`);
  }
  if (!['fit', 'fill', 'original'].includes(imageFit)) {
    throw ApiError.badRequest(`Unknown image fit: "${imageFit}"`);
  }
  const rotate = Array.isArray(raw.rotate) ? raw.rotate.map((v) => Number(v)) : [];
  return { pageSize, orientation, margin, imageFit, quality, rotate };
}

/** A4@72dpi is 595×842; "Original" maps pixels to points without downsizing. */
function dpToPts(px: number): number {
  return px;
}

function resolvePageSize(
  w: number,
  h: number,
  _rawW: number,
  _rawH: number,
  options: ImageToPdfOptions,
  _dpi: number,
): { pageWidth: number; pageHeight: number } {
  if (options.pageSize === 'original') {
    const landscape = w > h;
    return options.orientation === 'auto'
      ? { pageWidth: landscape ? Math.max(w, h) : Math.min(w, h), pageHeight: landscape ? Math.min(w, h) : Math.max(w, h) }
      : applyOrientation(w, h, options.orientation);
  }

  const dim = PAGE_SIZES[options.pageSize as NamedPageSize];
  let width: number = dim.width;
  let height: number = dim.height;
  const target = options.orientation === 'auto' ? (w >= h ? 'landscape' : 'portrait') : options.orientation;
  if (target === 'portrait' && width > height) [width, height] = [height, width];
  if (target === 'landscape' && width < height) [width, height] = [height, width];
  return { pageWidth: width, pageHeight: height };
}

function applyOrientation(w: number, h: number, orientation: 'portrait' | 'landscape'): { pageWidth: number; pageHeight: number } {
  return orientation === 'portrait'
    ? { pageWidth: Math.min(w, h), pageHeight: Math.max(w, h) }
    : { pageWidth: Math.max(w, h), pageHeight: Math.min(w, h) };
}

function cleanName(name: string): string {
  return name.replace(/\.(png|jpe?g|webp)$/i, '') || 'document';
}

async function renderToJpeg(
  input: ProcessorInput,
  rotation: number,
  quality: number,
): Promise<{ jpeg: Buffer; width: number; height: number }> {
  let pipeline = sharp(input.buffer, { failOn: 'none' });

  const normalizedRotation = ((rotation % 360) + 360) % 360;
  if (normalizedRotation !== 0) {
    pipeline = pipeline.rotate(normalizedRotation);
  }

  pipeline = pipeline
    .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
    .rotate() // honour EXIF orientation
    .flatten({ background: '#ffffff' });

  try {
    const { data, info } = await pipeline.jpeg({ quality }).toBuffer({ resolveWithObject: true });
    return { jpeg: data, width: info.width, height: info.height };
  } catch (error) {
    throw new ApiError(422, ERROR_CODES.PROCESSING_FAILED, `Could not decode "${input.name}". Is it a valid image?`, {
      cause: (error as Error).message,
    });
  }
}

function assertActive(ctx: ProcessorContext): void {
  if (ctx.signal.aborted) {
    throw new ApiError(409, ERROR_CODES.JOB_CANCELLED, 'Processing was cancelled.');
  }
}