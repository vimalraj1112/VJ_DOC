import { ApiError, ERROR_CODES } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { convertWithLibreOffice } from '../utils/office.js';
import { buildMinimalDocx, buildMinimalPptx, buildMinimalXlsx } from '../utils/msofficeXml.js';
import { extractTextLines } from '../utils/pdfText.js';
import type { Processor, ProcessorContext, ProcessorOutput } from './types.js';

/**
 * Office processor: converts between Office formats and PDF.
 *   docx/xlsx/pptx → pdf : rendered by headless LibreOffice (true WYSIWYG).
 *   pdf → pptx           : LibreOffice (PDF import lands in Draw → Impress).
 *   pdf → docx / xlsx    : LibreOffice attempt first, else text-extraction
 *                          into a clean minimal .docx / .xlsx (no external
 *                          engine needed, so these always produce a file).
 */

const LIBREOFFICE_MSG =
  'Office conversion needs LibreOffice on the server. Install it and restart, then this tool will work.';

export const officeProcessor: Processor = async (ctx) => {
  if (ctx.inputs.length !== 1) throw ApiError.badRequest('This tool expects exactly one file.');
  const op = String(ctx.options.op ?? '');
  const input = ctx.inputs[0];

  ctx.onProgress({ percent: 8, stage: 'Preparing document' });

  switch (op) {
    case 'docx-to-pdf':
      return officeToPdf(ctx, input, 'docx', 'word', 'pdf');
    case 'xlsx-to-pdf':
      return officeToPdf(ctx, input, 'xlsx', 'excel', 'pdf', 'calc_pdf_Export');
    case 'pptx-to-pdf':
      return officeToPdf(ctx, input, 'pptx', 'powerpoint', 'pdf', 'impress_pdf_Export');
    case 'pdf-to-pptx':
      return pdfToPptx(ctx, input);
    case 'pdf-to-docx':
      return pdfToDocx(ctx, input);
    case 'pdf-to-xlsx':
      return pdfToXlsx(ctx, input);
    default:
      throw ApiError.badRequest(`Unknown office operation "${op}".`);
  }
};

async function officeToPdf(
  ctx: ProcessorContext,
  input: ProcessorContext['inputs'][0],
  officeExt: string,
  officeKind: string,
  outputExt: string,
  filter?: string,
): Promise<{ outputs: ProcessorOutput[] }> {
  ctx.onProgress({ percent: 30, stage: `Converting ${officeKind} to PDF` });

  let result;
  try {
    result = await convertWithLibreOffice({
      buffer: input.buffer,
      originalName: input.name,
      outputExt,
      filter,
    });
  } catch (error) {
    if ((error as Error).message === 'LIBREOFFICE_MISSING') {
      throw new ApiError(503, ERROR_CODES.PROCESSING_FAILED, LIBREOFFICE_MSG);
    }
    throw new ApiError(422, ERROR_CODES.PROCESSING_FAILED, `Could not convert your ${officeKind.toUpperCase()} to PDF. Is the file valid?`, {
      cause: (error as Error).message,
    });
  }

  ctx.onProgress({ percent: 95, stage: 'Finalizing' });
  return {
    outputs: [
      {
        buffer: result.buffer,
        filename: `${officeBase(input.name)}.${outputExt}`,
        mimeType: 'application/pdf',
        ext: `.${outputExt}`,
        pages: null,
      },
    ],
  };
}

async function pdfToPptx(
  ctx: ProcessorContext,
  input: ProcessorContext['inputs'][0],
): Promise<{ outputs: ProcessorOutput[] }> {
  ctx.onProgress({ percent: 30, stage: 'Converting PDF to PPTX' });

  let result;
  try {
    result = await convertWithLibreOffice({
      buffer: input.buffer,
      originalName: input.name,
      outputExt: 'pptx',
    });
  } catch (error) {
    if ((error as Error).message === 'LIBREOFFICE_MISSING') {
      logger.warn('LibreOffice missing for PDF → PPTX; falling back to text slides.');
    } else {
      logger.warn('LibreOffice PDF → PPTX failed; falling back to text slides.', { cause: (error as Error).message });
    }
  }

  if (!result) return pdfToPptxFallback(ctx, input);

  ctx.onProgress({ percent: 95, stage: 'Finalizing' });
  return {
    outputs: [
      {
        buffer: result.buffer,
        filename: `${officeBase(input.name)}.pptx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ext: '.pptx',
        pages: null,
      },
    ],
  };
}

/** Text-extraction fallback that always produces a valid (text-only) PPTX. */
async function pdfToPptxFallback(
  ctx: ProcessorContext,
  input: ProcessorContext['inputs'][0],
): Promise<{ outputs: ProcessorOutput[] }> {
  ctx.onProgress({ percent: 30, stage: 'Extracting text' });
  const lines = await extractTextLines(input.buffer, {
    onProgress: (p, stage) => ctx.onProgress({ percent: 30 + (p * 0.55), stage }),
  });

  ctx.onProgress({ percent: 85, stage: 'Building slides' });
  const buffer = await buildMinimalPptx(lines);
  ctx.onProgress({ percent: 95, stage: 'Finalizing' });

  return {
    outputs: [
      {
        buffer,
        filename: `${officeBase(input.name)}.pptx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ext: '.pptx',
        pages: null,
      },
    ],
  };
}

async function pdfToDocx(ctx: ProcessorContext, input: ProcessorContext['inputs'][0]): Promise<{ outputs: ProcessorOutput[] }> {
  ctx.onProgress({ percent: 25, stage: 'Attempting faithful conversion' });

  // LibreOffice's PDF import round-trips well for many documents.
  try {
    const result = await convertWithLibreOffice({ buffer: input.buffer, originalName: input.name, outputExt: 'docx' });
    ctx.onProgress({ percent: 95, stage: 'Finalizing' });
    return {
      outputs: [
        {
          buffer: result.buffer,
          filename: `${officeBase(input.name)}.docx`,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ext: '.docx',
          pages: null,
        },
      ],
    };
  } catch {
    // LibreOffice missing or its PDF import bailed — fall back to the
    // always-available text path below instead of failing the job.
  }

  ctx.onProgress({ percent: 30, stage: 'Extracting text' });
  const lines = await extractTextLines(input.buffer, {
    onProgress: (p, stage) => ctx.onProgress({ percent: 30 + (p * 0.55), stage }),
  });
  ctx.onProgress({ percent: 85, stage: 'Building Word document' });
  const buffer = await buildMinimalDocx(lines);
  ctx.onProgress({ percent: 95, stage: 'Finalizing' });

  return {
    outputs: [
      {
        buffer,
        filename: `${officeBase(input.name)}.docx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ext: '.docx',
        pages: null,
      },
    ],
  };
}

async function pdfToXlsx(ctx: ProcessorContext, input: ProcessorContext['inputs'][0]): Promise<{ outputs: ProcessorOutput[] }> {
  ctx.onProgress({ percent: 30, stage: 'Extracting text' });
  const lines = await extractTextLines(input.buffer, {
    onProgress: (p, stage) => ctx.onProgress({ percent: 30 + (p * 0.55), stage }),
  });

  ctx.onProgress({ percent: 85, stage: 'Building spreadsheet' });
  const rows = lines.map((line) => splitCells(line));
  const buffer = await buildMinimalXlsx(rows);
  ctx.onProgress({ percent: 95, stage: 'Finalizing' });

  return {
    outputs: [
      {
        buffer,
        filename: `${officeBase(input.name)}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ext: '.xlsx',
        pages: null,
      },
    ],
  };
}

/** Splits a text line into cells on tab or runs of 3+ spaces. */
function splitCells(line: string): string[] {
  const cells = line.split(/\t|\s{3,}/).map((c) => c.trim());
  return cells.every((c) => c.length > 0) ? cells : [line.trim()];
}

function officeBase(name: string): string {
  return name.replace(/\.(docx|xlsx|pptx|pdf)$/i, '') || 'document';
}