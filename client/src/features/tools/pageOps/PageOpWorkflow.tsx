import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Scissors, X, ArrowLeftRight, ChevronUp, ChevronDown } from 'lucide-react';
import type { ToolDef } from '@/lib/tools';
import { useProcessJob } from '@/lib/useProcessJob';
import { usePdfThumbs } from '@/lib/usePdfThumbs';
import { formatBytes } from '@/lib/utils';
import { FileUploader } from '@/components/tools/FileUploader';
import { ToolSettings } from '@/components/tools/ToolSettings';
import { ProcessPanel } from '@/components/tools/ProcessPanel';
import { ToolResult } from '@/components/tools/ToolResult';
import { Button } from '@/components/ui/Button';
import type { Accept } from 'react-dropzone';

const OP_META: Record<string, { label: string; hint: string }> = {
  split: { label: 'Split into groups', hint: 'Each group of pages becomes its own PDF.' },
  extract: { label: 'Select pages to keep', hint: 'Only the pages you select are exported.' },
  delete: { label: 'Select pages to remove', hint: 'The pages you select are removed from the result.' },
  reorder: { label: 'Drag or move to reorder', hint: 'The order of the cards becomes the order of the PDF.' },
};

export function PageOpWorkflow({ tool }: { tool: ToolDef }) {
  const op = tool.pageOp ?? 'split';
  const [file, setFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<Record<string, string | number>>(() =>
    Object.fromEntries((tool.settings ?? []).map((s) => [s.key, s.default])),
  );
  const [selected, setSelected] = useState<number[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const thumbs = usePdfThumbs();
  const job = useProcessJob();

  const accept = useMemo<Accept>(() => ({ 'application/pdf': [] }), []);
  const meta = OP_META[op];

  const onFile = (files: File[]) => {
    const f = files[0];
    setFile(f);
    setSelected([]);
    thumbs.regenerate(f);
  };

  // Seed the reorder list once page count is known.
  useEffect(() => {
    if (op === 'reorder' && thumbs.pageCount > 0) {
      setOrder(Array.from({ length: thumbs.pageCount }, (_, i) => i + 1));
    }
  }, [op, thumbs.pageCount]);

  const movePage = (page: number, dir: -1 | 1) =>
    setOrder((prev) => {
      const idx = prev.findIndex((p) => p === page);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });

  const toggle = (page: number) =>
    setSelected((prev) => (prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page].sort((a, b) => a - b)));

  const isProcessing = job.state === 'processing' || job.state === 'uploading';
  const isDone = job.state === 'completed';

  const run = () => {
    if (!file) return;
    if (op === 'split') {
      job.run(tool.id, [file], { op, every: Number(settings.every ?? 1) });
    } else if (op === 'reorder') {
      job.run(tool.id, [file], { op, pages: order });
    } else {
      job.run(tool.id, [file], { op, pages: selected });
    }
  };

  const selectedCount = selected.length;
  const displayPages = op === 'reorder' ? order : Array.from({ length: thumbs.pageCount }, (_, i) => i + 1);
  const ready = op === 'split' ? Boolean(file) : op === 'reorder' ? order.length > 0 : selected.length > 0;

  if (isProcessing) return <ProcessPanel progress={job.progress} stage={job.stage} onCancel={job.cancel} />;
  if (isDone && job.result) {
    return (
      <ToolResult
        files={job.result.outputFiles}
        onAnother={() => {
          job.reset();
          setFile(null);
          setSelected([]);
          setOrder([]);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {!file ? (
        <FileUploader accept={accept} multiple={false} title="Drop your PDF here" subtitle="We'll preview every page" onFiles={onFile} />
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
              <Scissors className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted">
                {formatBytes(file.size)}
                {thumbs.pageCount ? ` · ${thumbs.pageCount} pages` : ''}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
              Change
            </Button>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-muted">{meta.label}</p>
              <div className="flex gap-2">
                {op !== 'split' && (
                  <Button variant="ghost" size="xs" onClick={() => setSelected(Array.from({ length: thumbs.pageCount }, (_, i) => i + 1))}>
                    Select all
                  </Button>
                )}
                <Button variant="ghost" size="xs" onClick={() => setSelected([])}>
                  Clear
                </Button>
              </div>
            </div>

            {thumbs.loading ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-surface-3" />
                ))}
              </div>
            ) : (
              <div className="max-h-[460px] overflow-y-auto pr-1">
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {displayPages.map((page, i) => {
                    const src = thumbs.thumbs[page - 1];
                    const active = selected.includes(page);
                    if (op === 'reorder') {
                      return (
                        <div key={page} className="relative">
                          <img src={src} alt={`Page ${page}`} className="aspect-[3/4] w-full rounded-lg border border-line object-cover" />
                          <span className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-md bg-black/60 text-[10px] font-semibold text-white">
                            {i + 1}
                          </span>
                          <div className="mt-1 flex justify-center gap-1">
                            <button disabled={i === 0} onClick={() => movePage(page, -1)} className="rounded p-1 text-muted hover:bg-surface-2 disabled:opacity-30" aria-label="Move earlier">
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button disabled={i === order.length - 1} onClick={() => movePage(page, 1)} className="rounded p-1 text-muted hover:bg-surface-2 disabled:opacity-30" aria-label="Move later">
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <button key={page} onClick={() => toggle(page)} aria-pressed={active} className="group relative text-left" disabled={op === 'split'}>
                        <img
                          src={src}
                          alt={`Page ${page}`}
                          className="aspect-[3/4] w-full rounded-lg border-2 object-cover transition-all"
                          style={{ borderColor: active ? 'var(--primary)' : 'var(--line)' }}
                        />
                        <span
                          className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-md text-[10px] font-semibold text-white transition-colors"
                          style={{ background: active ? 'var(--primary)' : 'rgba(0,0,0,.5)' }}
                        >
                          {active ? <Check className="h-3 w-3" /> : page}
                        </span>
                        {op === 'delete' && active && (
                          <span className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-md bg-red-500 text-white">
                            <X className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {op === 'split' && (
              <div className="mt-4 border-t border-line pt-4">
                <ToolSettings fields={tool.settings ?? []} values={settings} onChange={(k, v) => setSettings((s) => ({ ...s, [k]: v }))} />
              </div>
            )}
          </div>

          {op === 'reorder' && (
            <p className="text-sm text-muted">Reorder by moving pages — order shown is the output order.</p>
          )}
        </>
      )}

      {file && !isProcessing && !isDone && (
        <div className="sticky bottom-4 z-20 rounded-2xl border border-line bg-surface/90 p-3 shadow-pop backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <p className="hidden pl-2 text-sm text-muted sm:block">
              {op === 'split' ? `${String(settings.every ?? 1)} page${Number(settings.every) === 1 ? '' : 's'} per file` : `${selectedCount} page${selectedCount === 1 ? '' : 's'} selected`}
            </p>
            <Button size="lg" disabled={!ready} onClick={run} loading={job.state === 'uploading'} className="w-full sm:w-auto sm:min-w-[160px]">
              {op === 'split' ? <Scissors className="h-4 w-4" /> : op === 'delete' ? <X className="h-4 w-4" /> : <ArrowLeftRight className="h-4 w-4" />}
              {op === 'split' ? 'Split PDF' : op === 'delete' ? 'Delete pages' : op === 'reorder' ? 'Reorder PDF' : 'Extract pages'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}