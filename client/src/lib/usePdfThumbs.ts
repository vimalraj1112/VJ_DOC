import { useEffect, useRef, useState } from 'react';
import { renderPdfPage, canvasToDataUrl, countPdfPages } from './pdf';

export interface PdfThumbs {
  pageCount: number;
  thumbs: string[];
  loading: boolean;
  error: string | null;
  /** Regenerate from a fresh source (e.g. a newly selected file). */
  regenerate: (source: File) => void;
}

export function usePdfThumbs(): PdfThumbs {
  const [source, setSource] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!source) return;
    const token = ++seq.current;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const count = await countPdfPages(source);
        setPageCount(count);
        const data: string[] = new Array(count);
        await Promise.all(
          Array.from({ length: count }, (_, i) => i + 1).map(async (p) => {
            const { canvas } = await renderPdfPage(source, p, 180);
            data[p - 1] = canvasToDataUrl(canvas, 'image/jpeg', 0.7);
          }),
        );
        if (token === seq.current) {
          setThumbs(data);
          setLoading(false);
        }
      } catch (err) {
        if (token === seq.current) {
          setError(err instanceof Error ? err.message : 'Could not preview this PDF.');
          setLoading(false);
        }
      }
    })();
    return () => {
      seq.current += 1;
    };
  }, [source]);

  return { pageCount, thumbs, loading, error, regenerate: setSource };
}