import sharp from 'sharp';
import { ApiError, ERROR_CODES } from '../utils/ApiError.js';
import type { Processor, ProcessorContext, ProcessorInput, ProcessorOutput } from './types.js';

/**
 * imageOpProcessor: in-place image transforms driven by `options.op`.
 *   op 'format' → transcode to a target format (jpeg/png/webp) at a quality.
 *   op 'resize' → scale by a percentage, preserving aspect ratio.
 *   op 'crop'   → extract a box given as percentages of the source dimensions.
 * Each input yields one output, so N images come back as N files (mirrors the
 * pdfToImage multi-output convention that ToolResult already renders).
 */

const TARGET: Record<'jpg' | 'png' | 'webp', { ext: string; mime: string }> = {
  jpg: { ext: '.jpg', mime: 'image/jpeg' },
  png: { ext: '.png', mime: 'image/png' },
  webp: { ext: '.webp', mime: 'image/webp' },
};

export const imageOpProcessor: Processor = async (ctx) => {
  const op = String(ctx.options.op ?? 'format');
  const total = ctx.inputs.length;
  const outputs: ProcessorOutput[] = [];

  for (let i = 0; i < total; i++) {
    assertActive(ctx);
    const input = ctx.inputs[i];
    const base = input.name.replace(/\.(png|jpe?g|webp)$/i, '') || 'image';

    const { buffer, ext, mime } = await runOp(input, op, ctx.options);

    outputs.push({
      buffer,
      filename: `${base}${ext}`,
      mimeType: mime,
      ext,
      pages: null,
    });

    ctx.onProgress({
      percent: Math.round(((i + 1) / total) * 100),
      stage: total === 1 ? op === 'format' ? 'Converting' : 'Processing' : `${i + 1} of ${total}`,
    });
  }

  return { outputs };
};

async function runOp(
  input: ProcessorInput,
  op: string,
  options: Record<string, unknown>,
): Promise<{ buffer: Buffer; ext: string; mime: string }> {
  try {
    if (op === 'format') {
      const target = String(options.format ?? 'png') as keyof typeof TARGET;
      const t = TARGET[target];
      if (!t) throw ApiError.badRequest(`Unknown target format "${target}".`);
      const quality = clampInt(options.quality, 82, 10, 100);
      const buffer = await sharp(input.buffer, { failOn: 'none' })
        .rotate()
        .toFormat(target === 'jpg' ? 'jpeg' : target, { quality })
        .toBuffer();
      return { buffer, ext: t.ext, mime: t.mime };
    }

    const meta = await sharp(input.buffer, { failOn: 'none' }).metadata();
    const iw = meta.width ?? 1;
    const ih = meta.height ?? 1;

    if (op === 'resize') {
      const scale = clampInt(options.scale, 75, 5, 200);
      const width = Math.max(1, Math.round((iw * scale) / 100));
      const height = Math.max(1, Math.round((ih * scale) / 100));
      const buffer = await sharp(input.buffer, { failOn: 'none' })
        .rotate()
        .resize({ width, height, fit: 'inside' })
        .toBuffer();
      const t = TARGET[extOf(input.mimeType)];
      return { buffer, ext: t.ext, mime: t.mime };
    }

    if (op === 'crop') {
      const left = Math.round(iw * clampPct(options.left, 0) / 100);
      const top = Math.round(ih * clampPct(options.top, 0) / 100);
      const width = Math.max(1, Math.min(iw - left, Math.round(iw * clampPct(options.width, 100) / 100)));
      const height = Math.max(1, Math.min(ih - top, Math.round(ih * clampPct(options.height, 100) / 100)));
      const buffer = await sharp(input.buffer, { failOn: 'none' })
        .rotate()
        .extract({
          left: Math.min(left, Math.max(0, iw - 1)),
          top: Math.min(top, Math.max(0, ih - 1)),
          width,
          height,
        })
        .toBuffer();
      const t = TARGET[extOf(input.mimeType)];
      return { buffer, ext: t.ext, mime: t.mime };
    }

    throw ApiError.badRequest(`Unknown image operation "${op}".`);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, ERROR_CODES.PROCESSING_FAILED, `Could not process "${input.name}". Is it a valid image?`, {
      cause: (error as Error).message,
    });
  }
}

function extOf(mime: string): keyof typeof TARGET {
  if (mime.includes('jpeg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  return 'png';
}

function clampInt(v: unknown, fallback: number, min: number, max: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function clampPct(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : fallback;
}

function assertActive(ctx: ProcessorContext): void {
  if (ctx.signal.aborted) {
    throw new ApiError(409, ERROR_CODES.JOB_CANCELLED, 'Processing was cancelled.');
  }
}