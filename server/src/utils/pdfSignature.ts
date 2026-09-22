import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { openPdf, baseName } from '../processors/pdfLibProcessors.js';

/**
 * Stamps a typed signature onto the last page of a PDF. Pure pdf-lib, so it
 * runs fully in-memory and produces a vector (selectable, high-quality) result.
 * Used by the remote "Request Signature" flow and mirroring the Sign PDF tool.
 */
interface TypedSignatureOptions {
  /** The name rendered in handwriting-esque italics. */
  name: string;
  /** Timestamp label drawn beneath the signature. Defaults to today. */
  date?: Date;
}

export async function signPdfWithTypedSignature(
  buffer: Buffer,
  fileName: string,
  options: TypedSignatureOptions,
): Promise<{ buffer: Buffer; pages: number }> {
  const name = options.name.trim();
  if (!name) throw new Error('A signature name is required.');

  const src = await openPdf(buffer, fileName);
  const totalPages = src.getPageCount();
  const italic = await src.embedFont(StandardFonts.TimesRomanItalic);
  const small = await src.embedFont(StandardFonts.Helvetica);

  const page = src.getPage(totalPages - 1);
  const { width, height } = page.getSize();

  const nameSize = 28;
  const nameWidth = italic.widthOfTextAtSize(name, nameSize);
  const x = Math.max(24, width - nameWidth - 48);
  const y = 52;

  page.drawText(name, {
    x,
    y,
    size: nameSize,
    font: italic,
    color: rgb(0.1, 0.1, 0.2),
  });

  const date = options.date ?? new Date();
  const label = `Signed electronically on ${date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}`;
  page.drawText(label, {
    x: Math.max(24, width - small.widthOfTextAtSize(label, 10) - 48),
    y: y - 18,
    size: 10,
    font: small,
    color: rgb(0.35, 0.35, 0.35),
  });

  const bytes = await src.save({ useObjectStreams: true });
  return { buffer: Buffer.from(bytes), pages: totalPages };
}

export function signedFileName(fileName: string): string {
  return `${baseName(fileName)}-signed.pdf`;
}