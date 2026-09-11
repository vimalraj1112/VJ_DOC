import { degrees } from 'pdf-lib';
import { baseName, openPdf, assertActive } from './pdfLibProcessors.js';
import { ApiError } from '../utils/ApiError.js';
import type { Processor } from './types.js';

/**
 * Rotate: spins every page of a single PDF by a fixed 90° increment.
 * Pure pdf-lib; runs fully in-memory.
 */

const VALID_ANGLES = [0, 90, 180, 270];

export const rotatePdfProcessor: Processor = async (ctx) => {
  if (ctx.inputs.length !== 1) throw ApiError.badRequest('Rotate expects exactly one PDF.');
  const input = ctx.inputs[0];
  const angle = Number(ctx.options.angle ?? 90) % 360;

  if (!VALID_ANGLES.includes(angle)) {
    throw ApiError.badRequest(`Rotation must be 90°, 180°, or 270° (received ${angle}°).`);
  }

  const src = await openPdf(input.buffer, input.name);
  const totalPages = src.getPageCount();

  for (let i = 0; i < totalPages; i++) {
    assertActive(ctx);
    src.getPage(i).setRotation(degrees(angle));
    ctx.onProgress({
      percent: Math.round(((i + 1) / totalPages) * 92),
      stage: `Rotating page ${i + 1} of ${totalPages}`,
    });
  }

  ctx.onProgress({ percent: 96, stage: 'Finalizing document' });
  const bytes = await src.save({ useObjectStreams: true });
  ctx.onProgress({ percent: 100, stage: 'Ready' });

  return {
    outputs: [
      {
        buffer: Buffer.from(bytes),
        filename: `${baseName(input.name)}-rotated.pdf`,
        mimeType: 'application/pdf',
        ext: '.pdf',
        pages: totalPages,
      },
    ],
  };
};