import { PDFDocument } from 'pdf-lib';
import archiver from 'archiver';
import { ApiError, ERROR_CODES } from '../utils/ApiError.js';
import type { Processor, ProcessorContext, ProcessorResult } from './types.js';

/**
 * Merge: combines several PDFs into one, honouring the user's drag order.
 * Pages: extracts, deletes, reorders or splits pages of a single PDF.
 * Both are pure pdf-lib so they run fully in-memory.
 */

export const mergePdfProcessor: Processor = async (ctx) => {
  if (ctx.inputs.length < 2) throw ApiError.badRequest('Merge needs at least two PDFs.');
  const merged = await PDFDocument.create();
  const total = ctx.inputs.length;

  for (let i = 0; i < total; i++) {
    assertActive(ctx);
    const src = await openPdf(ctx.inputs[i].buffer, ctx.inputs[i].name);
    const copied = await merged.copyPages(src, src.getPageIndices());
    copied.forEach((page) => merged.addPage(page));
    ctx.onProgress({ percent: Math.round(((i + 1) / total) * 90), stage: `Merging ${ctx.inputs[i].name}` });
  }

  ctx.onProgress({ percent: 94, stage: 'Finalizing document' });
  const bytes = await merged.save({ useObjectStreams: true });
  ctx.onProgress({ percent: 100, stage: 'Ready' });
  return {
    outputs: [
      {
        buffer: Buffer.from(bytes),
        filename: deriveMergeName(ctx.inputs),
        mimeType: 'application/pdf',
        ext: '.pdf',
        pages: merged.getPageCount(),
      },
    ],
  };
};

interface PageOpsOptions {
  /** Which operation to run. */
  op: 'extract' | 'delete' | 'reorder' | 'split';
  /** 1-indexed pages to keep (extract), remove (delete), or the target order (reorder). */
  pages: number[];
  /** Split every N pages when op === 'split'. */
  every: number;
}

export const pageOpsProcessor: Processor = async (ctx) => {
  if (ctx.inputs.length !== 1) throw ApiError.badRequest('This tool expects exactly one PDF.');
  const input = ctx.inputs[0];
  const src = await openPdf(input.buffer, input.name);
  const totalPages = src.getPageCount();
  const opts = normalizePageOps(ctx.options, totalPages);

  const results = await runPageOp(ctx, src, opts, totalPages);

  if (results.length === 1) {
    ctx.onProgress({ percent: 100, stage: 'Ready' });
    return { outputs: results[0].outputs };
  }

  // Multiple split documents => single ZIP.
  const zip = await buildZip(results.flatMap((r) => r.outputs));
  ctx.onProgress({ percent: 100, stage: 'Ready' });
  return {
    outputs: [
      {
        buffer: zip,
        filename: `${baseName(input.name)}-parts.zip`,
        mimeType: 'application/zip',
        ext: '.zip',
        pages: results.length,
      },
    ],
  };
};

async function runPageOp(
  ctx: ProcessorContext,
  src: PDFDocument,
  opts: PageOpsOptions,
  totalPages: number,
): Promise<ProcessorResult[]> {
  if (opts.op === 'split') {
    const groups = chunkRanges(totalPages, opts.every);
    const split: ProcessorResult[] = [];
    for (let g = 0; g < groups.length; g++) {
      assertActive(ctx);
      const doc = await PDFDocument.create();
      const copied = await doc.copyPages(src, groups[g].map((p) => p - 1));
      copied.forEach((page) => doc.addPage(page));
      const bytes = await doc.save({ useObjectStreams: true });
      split.push({
        outputs: [
          {
            buffer: Buffer.from(bytes),
            filename: `${baseName(ctx.inputs[0].name)}-part-${g + 1}.pdf`,
            mimeType: 'application/pdf',
            ext: '.pdf',
            pages: groups[g].length,
          },
        ],
      });
      ctx.onProgress({ percent: Math.round(((g + 1) / groups.length) * 90), stage: `Splitting part ${g + 1}` });
    }
    return split;
  }

  const indices = opts.op === 'delete' ? preserveExcept(totalPages, opts.pages) : opts.pages;
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indices.map((p) => p - 1));
  copied.forEach((page) => out.addPage(page));
  const bytes = await out.save({ useObjectStreams: true });
  ctx.onProgress({ percent: 96, stage: 'Finalizing document' });

  return [
    {
      outputs: [
        {
          buffer: Buffer.from(bytes),
          filename: `${baseName(ctx.inputs[0].name)}${label(opts.op)}.pdf`,
          mimeType: 'application/pdf',
          ext: '.pdf',
          pages: out.getPageCount(),
        },
      ],
    },
  ];
}

function chunkRanges(totalPages: number, every: number): number[][] {
  const groups: number[][] = [];
  for (let start = 0; start < totalPages; start += every) {
    const range: number[] = [];
    for (let p = start; p < Math.min(start + every, totalPages); p++) range.push(p + 1);
    groups.push(range);
  }
  return groups;
}

export function normalizePageOps(raw: Record<string, unknown>, totalPages: number): PageOpsOptions {
  const op = (['extract', 'delete', 'reorder', 'split'] as const).includes(raw.op as never)
    ? (raw.op as PageOpsOptions['op'])
    : 'split';
  const every = Math.max(1, Math.floor(Number(raw.every) || 1));
  const pages = Array.isArray(raw.pages) ? raw.pages.map(Number) : [];

  if (op !== 'split') {
    const set = new Set<number>();
    for (const p of pages) {
      if (!Number.isInteger(p) || p < 1 || p > totalPages) {
        throw ApiError.badRequest(`Invalid page number: ${p}. Document has ${totalPages} page${totalPages === 1 ? '' : 's'}.`);
      }
      set.add(p);
    }
    if (set.size === 0) throw ApiError.badRequest('No pages selected.');
    return { op, pages: [...set], every };
  }
  return { op, pages: [], every };
}

function preserveExcept(totalPages: number, toDelete: number[]): number[] {
  const drop = new Set(toDelete);
  const kept: number[] = [];
  for (let p = 1; p <= totalPages; p++) if (!drop.has(p)) kept.push(p);
  if (kept.length === 0) throw ApiError.badRequest('You cannot delete every page.');
  return kept;
}

export function openPdf(buffer: Buffer, name: string): Promise<PDFDocument> {
  return PDFDocument.load(buffer, { ignoreEncryption: false }).catch((error) => {
    throw new ApiError(422, ERROR_CODES.PROCESSING_FAILED, `Could not read "${name}". Is it a valid, unencrypted PDF?`, {
      cause: (error as Error).message,
    });
  });
}

function deriveMergeName(inputs: ProcessorContext['inputs']): string {
  return `${baseName(inputs[0].name)}-merged.pdf`;
}

export function baseName(name: string): string {
  return name.replace(/\.pdf$/i, '') || 'document';
}

function label(op: string): string {
  return op === 'extract' ? '-extracted' : op === 'delete' ? '-pages-removed' : '-reordered';
}

function buildZip(entries: ProcessorOutputLike[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    for (const entry of entries) archive.append(entry.buffer, { name: entry.filename });
    void archive.finalize();
  });
}

interface ProcessorOutputLike {
  buffer: Buffer;
  filename: string;
}

export function assertActive(ctx: ProcessorContext): void {
  if (ctx.signal.aborted) throw new ApiError(409, ERROR_CODES.JOB_CANCELLED, 'Processing was cancelled.');
}