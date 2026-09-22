import { ApiError } from '../utils/ApiError.js';
import { extractPages } from '../utils/pdfText.js';
import { chatComplete, clampContext } from '../services/aiClient.js';
import type { Processor, ProcessorContext, ProcessorOutput } from './types.js';

/**
 * AI document processor.
 *   op 'markdown' → local, dependency-free PDF → Markdown conversion via the
 *                   pdfjs text layer (headings, paragraphs and page breaks).
 *   op 'summary'  → extract the text, ask the configured LLM for a concise
 *                   summary, return it as a .md file.
 *   op 'ask'      → put the document text in context and answer the user's
 *                   question (`options.question`).
 */

export const aiDocumentProcessor: Processor = async (ctx) => {
  if (ctx.inputs.length !== 1) throw ApiError.badRequest('This tool expects exactly one PDF.');
  const op = String(ctx.options.op ?? 'markdown');

  if (op === 'markdown') return pdfToMarkdown(ctx);
  if (op === 'summary') return aiSummary(ctx);
  if (op === 'ask') return askPdf(ctx);

  throw ApiError.badRequest(`Unknown AI document operation "${op}".`);
};

async function pdfToMarkdown(ctx: ProcessorContext): Promise<{ outputs: ProcessorOutput[] }> {
  const input = ctx.inputs[0];
  const pages = await extractPages(input.buffer, {
    onProgress: (p, stage) => ctx.onProgress({ percent: p, stage }),
  });

  const blocks: string[] = [];
  for (const { page, lines } of pages) {
    blocks.push(`## Page ${page}\n`);
    blocks.push(toMarkdown(lines));
  }

  const content = blocks.join('\n\n');
  ctx.onProgress({ percent: 100, stage: 'Ready' });

  return {
    outputs: [
      {
        buffer: Buffer.from(content, 'utf8'),
        filename: `${baseOf(input.name)}.md`,
        mimeType: 'text/markdown',
        ext: '.md',
        pages: pages.length,
      },
    ],
  };
}

function toMarkdown(lines: string[]): string {
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Bullet-ish lines become list items.
    if (/^[•\-*]\s+/.test(trimmed)) {
      out.push(`- ${trimmed.replace(/^[•\-*]\s+/, '')}`);
      continue;
    }

    // Short lines that do not end in punctuation are promoted to headings.
    if (looksLikeHeading(trimmed)) {
      out.push(`## ${trimmed}`);
    } else {
      out.push(trimmed);
    }
  }
  return out.join('\n');
}

function looksLikeHeading(line: string): boolean {
  return line.length <= 60 && !/[.;,]$/.test(line) && line.split(/\s+/).length <= 8;
}

async function aiSummary(ctx: ProcessorContext): Promise<{ outputs: ProcessorOutput[] }> {
  const input = ctx.inputs[0];
  const text = await extractFullText(ctx, input);
  const answer = await chatComplete({
    system:
      'You are a precise document summariser. Write a clear, structured Markdown summary: an overview, the 3–5 key points (bullets), and a closing takeaway. Do not invent facts.',
    user: `Summarise this document:\n\n${clampContext(text)}`,
  });

  const content = `# AI Summary — ${baseOf(input.name)}\n\n${answer}\n`;
  ctx.onProgress({ percent: 100, stage: 'Ready' });

  return {
    outputs: [
      {
        buffer: Buffer.from(content, 'utf8'),
        filename: `${baseOf(input.name)}-summary.md`,
        mimeType: 'text/markdown',
        ext: '.md',
        pages: null,
      },
    ],
  };
}

async function askPdf(ctx: ProcessorContext): Promise<{ outputs: ProcessorOutput[] }> {
  const input = ctx.inputs[0];
  const question = String(ctx.options.question ?? '').trim();
  if (!question) throw ApiError.badRequest('Type a question about your document.');

  const text = await extractFullText(ctx, input);
  const answer = await chatComplete({
    system:
      'Answer the user\'s question using ONLY the provided document text. If the document does not contain the answer, say so plainly. Quote the relevant passage where helpful. Markdown formatting, concise.',
    user: `DOCUMENT:\n${clampContext(text)}\n\nQUESTION: ${question}\n\nAnswer:`,
  });

  const content = `# Ask PDF — ${baseOf(input.name)}\n\n**Question:** ${question}\n\n${answer}\n`;
  ctx.onProgress({ percent: 100, stage: 'Ready' });

  return {
    outputs: [
      {
        buffer: Buffer.from(content, 'utf8'),
        filename: `${baseOf(input.name)}-answer.md`,
        mimeType: 'text/markdown',
        ext: '.md',
        pages: null,
      },
    ],
  };
}

async function extractFullText(ctx: ProcessorContext, input: ProcessorContext['inputs'][0]): Promise<string> {
  const pages = await extractPages(input.buffer, {
    onProgress: (p, stage) => ctx.onProgress({ percent: Math.round(p * 0.9), stage }),
  });
  if (!pages.length) throw ApiError.badRequest('No text could be extracted from this PDF.');
  return pages.flatMap((p) => [`[Page ${p.page}]`, ...p.lines]).join('\n');
}

function baseOf(name: string): string {
  return name.replace(/\.pdf$/i, '') || 'document';
}