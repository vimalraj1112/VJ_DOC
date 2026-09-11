import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, FileImage } from 'lucide-react';
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

export function PdfToImageWorkflow({ tool }: { tool: ToolDef }) {
  const [file, setFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<Record<string, string | number>>(() =>
    Object.fromEntries((tool.settings ?? []).map((s) => [s.key, s.default])),
  );
  const [selected, setSelected] = useState<number[]>([]);
  const thumbs = usePdfThumbs();
  const job = useProcessJob();

  const accept = useMemo<Accept>(() => ({ 'application/pdf': [] }), []);
  const mode = String(settings.mode ?? 'all');

  const onFile = (files: File[]) => {
    const f = files[0];
    setFile(f);
    setSelected([]);
    thumbs.regenerate(f);
  };

  const toggle = (page: number) =>
    setSelected((prev) => (prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page].sort((a, b) => a - b)));

  const ready = mode === 'selected' ? selected.length > 0 : Boolean(file);
  const isProcessing = job.state === 'processing' || job.state === 'uploading';
  const isDone = job.state === 'completed';

  const convert = () => {
    if (!file) return;
    const options: Record<string, string | number | number[]> = {
      mode,
      format: String(settings.format),
      scale: Number(settings.scale ?? 2),
      quality: Number(settings.quality ?? 85),
    };
    if (mode === 'selected') options.pages = selected;
    job.run(tool.id, [file], options);
  };

  if (isProcessing) return <ProcessPanel progress={job.progress} stage={job.stage} onCancel={job.cancel} />;
  if (isDone && job.result) {
    return (
      <ToolResult
        files={job.result.outputFiles}
        onAnother={() => {
          job.reset();
          setFile(null);
          setSelected([]);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {!file ? (
        <FileUploader accept={accept} multiple={false} title="Drop your PDF here" subtitle="Export its pages as images" onFiles={onFile} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div>
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-red-500/10 text-red-500">
                <FileImage className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted">{formatBytes(file.size)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                Change
              </Button>
            </div>

            {mode === 'selected' && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-muted">Select the pages to export{thumbs.pageCount ? ` · ${thumbs.pageCount} pages` : ''}</p>
                  <Button variant="ghost" size="xs" onClick={() => setSelected(Array.from({ length: thumbs.pageCount }, (_, i) => i + 1))}>
                    Select all
                  </Button>
                </div>
                {thumbs.loading ? (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-surface-3" />
                    ))}
                  </div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto pr-1">
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                      {thumbs.thumbs.map((src, i) => {
                        const page = i + 1;
                        const active = selected.includes(page);
                        return (
                          <button key={page} onClick={() => toggle(page)} aria-pressed={active} className="group relative text-left">
                            <img src={src} alt={`Page ${page}`} className="aspect-[3/4] w-full rounded-lg border object-cover transition-all" style={{ borderColor: active ? 'var(--primary)' : 'var(--line)' }} />
                            <span
                              className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-md text-[10px] font-semibold text-white transition-colors"
                              style={{ background: active ? 'var(--primary)' : 'rgba(0,0,0,.5)' }}
                            >
                              {active ? <Check className="h-3 w-3" /> : page}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="rounded-2xl border border-line bg-surface p-5 shadow-sm lg:self-start">
            <h4 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold">
              <FileImage className="h-4 w-4 text-primary" /> Export settings
            </h4>
            <ToolSettings fields={tool.settings ?? []} values={settings} onChange={(k, v) => setSettings((s) => ({ ...s, [k]: v }))} />
          </aside>
        </div>
      )}

      {file && !isProcessing && !isDone && (
        <div className="sticky bottom-4 z-20 rounded-2xl border border-line bg-surface/90 p-3 shadow-pop backdrop-blur-xl">
          <Button size="lg" disabled={!ready} onClick={convert} loading={job.state === 'uploading'} className="w-full sm:w-auto sm:min-w-[160px]">
            Convert to {String(settings.format).toUpperCase()}
          </Button>
        </div>
      )}
    </div>
  );
}