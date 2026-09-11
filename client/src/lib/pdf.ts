import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Vite inlines the worker as a real asset URL (no Node required on the client).
GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

function toUint8Array(source: ArrayBuffer | Buffer | Uint8Array): Uint8Array {
  if (source instanceof Uint8Array) return source;
  return new Uint8Array(source as ArrayBuffer);
}

/** Load a PDF document from a File or raw bytes. */
async function openPdf(source: File | ArrayBuffer | Uint8Array) {
  const data =
    typeof File !== 'undefined' && source instanceof File ? await source.arrayBuffer() : (source as ArrayBuffer | Uint8Array);
  return getDocument({ data: toUint8Array(data) }).promise;
}

export async function countPdfPages(source: File | ArrayBuffer | Uint8Array): Promise<number> {
  const doc = await openPdf(source);
  const count = doc.numPages;
  await doc.destroy();
  return count;
}

/**
 * Render page `pageNumber` (1-indexed) of `source` onto a new canvas scaled so
 * the rendered width ≈ `targetWidth` px. Cleaner for the caller to drop into
 * an <img>. The canvas is returned so the caller owns its lifecycle.
 */
export async function renderPdfPage(
  source: File | ArrayBuffer | Uint8Array,
  pageNumber: number,
  targetWidth = 240,
): Promise<{ canvas: HTMLCanvasElement; pageCount: number }> {
  const doc = await openPdf(source);
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const scale = (targetWidth / base.width) * 1.2; // slight oversampling → crisper thumbs
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable.');
  await page.render({ canvasContext: context, viewport }).promise;
  const pageCount = doc.numPages;
  await page.cleanup();
  await doc.destroy();
  return { canvas, pageCount };
}

export function canvasToDataUrl(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.85): string {
  return canvas.toDataURL(type, quality);
}