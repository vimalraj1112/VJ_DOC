import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Copy, RotateCw, ChevronUp, ChevronDown, GripVertical, Images, FileUp } from 'lucide-react';
import type { ToolDef } from '@/lib/tools';
import { useProcessJob } from '@/lib/useProcessJob';
import { formatBytes, uid } from '@/lib/utils';
import { FileUploader } from '@/components/tools/FileUploader';
import { ToolSettings } from '@/components/tools/ToolSettings';
import { ProcessPanel } from '@/components/tools/ProcessPanel';
import { ToolResult } from '@/components/tools/ToolResult';
import { Button } from '@/components/ui/Button';
import type { Accept } from 'react-dropzone';

interface Item {
  id: string;
  file: File;
  rotation: number;
}
export function ImageToPdfWorkflow({ tool }: { tool: ToolDef }) {
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Record<string, string | number>>(() =>
    Object.fromEntries((tool.settings ?? []).map((s) => [s.key, s.default])),
  );
  const job = useProcessJob();

  const accept = useMemo<Accept>(() => ({ [tool.accept]: [] }), [tool.accept]);

  const addFiles = (incoming: File[]) => {
    setItems((prev) => [
      ...prev,
      ...incoming.map((file) => ({ id: uid(), file, rotation: 0 })).slice(0, tool.maxFiles - prev.length),
    ]);
  };

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const rotate = (id: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, rotation: (i.rotation + 90) % 360 } : i)));
  const duplicate = (id: string) =>
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx < 0) return prev;
      const copy = { ...prev[idx], id: uid() };
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });
  const move = (id: string, dir: -1 | 1) =>
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });

  const ready = items.length >= tool.minFiles;
  const isProcessing = job.state === 'processing' || job.state === 'uploading';
  const isDone = job.state === 'completed';

  const createPdf = () => {
    const rotate = items.map((i) => i.rotation);
    job.run(tool.id, items.map((i) => i.file), { ...settings, rotate });
  };

  if (isProcessing) {
    return <ProcessPanel progress={job.progress} stage={job.stage} onCancel={job.cancel} />;
  }
  if (isDone && job.result) {
    return (
      <ToolResult
        files={job.result.outputFiles}
        onAnother={() => {
          job.reset();
          setItems([]);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {items.length === 0 ? (
        <FileUploader
          accept={accept}
          multiple
          maxFiles={tool.maxFiles}
          title="Drop your images here"
          subtitle={tool.tagline}
          hint={`Up to ${tool.maxFiles} files`}
          onFiles={addFiles}
        />
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            {/* Preview grid */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-muted">
                  {items.length} image{items.length === 1 ? '' : 's'} · reorder and adjust then create the PDF
                </p>
                <div className="flex">
                  <Button variant="ghost" size="sm" onClick={() => setItems([])}>
                    Clear
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => document.getElementById('add-files')?.click()}>
                    + Add
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                <AnimatePresence>
                  {items.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="group relative overflow-hidden rounded-xl border border-line bg-surface"
                    >
                      <div className="relative aspect-[3/4] bg-surface-2">
                        <img
                          src={item.file instanceof File ? URL.createObjectURL(item.file) : ''}
                          alt={item.file.name}
                          className="h-full w-full object-contain p-2"
                          style={{ transform: `rotate(${item.rotation}deg)` }}
                        />
                        <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-md bg-black/60 text-xs font-medium text-white">
                          {idx + 1}
                        </span>
                        <div className="absolute right-0 top-0 flex flex-col opacity-0 transition-opacity group-hover:opacity-100">
                          <button onClick={() => remove(item.id)} className="grid h-8 w-8 place-items-center rounded-lg bg-black/60 text-white hover:bg-red-500" aria-label={`Remove ${item.file.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 p-2">
                        <GripVertical className="h-4 w-4 text-faint" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{item.file.name}</p>
                          <p className="text-[11px] text-faint">{formatBytes(item.file.size)}</p>
                        </div>
                        <div className="flex gap-0.5">
                          <IconBtn label="Rotate" onClick={() => rotate(item.id)}>
                            <RotateCw className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn label="Duplicate" onClick={() => duplicate(item.id)}>
                            <Copy className="h-3.5 w-3.5" />
                          </IconBtn>
                        </div>
                      </div>
                      {/* move controls (touch friendly) */}
                      <div className="flex justify-center gap-2 border-t border-line p-1.5">
                        <button disabled={idx === 0} onClick={() => move(item.id, -1)} className="rounded p-1 text-muted hover:bg-surface-2 disabled:opacity-30">
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button disabled={idx === items.length - 1} onClick={() => move(item.id, 1)} className="rounded p-1 text-muted hover:bg-surface-2 disabled:opacity-30">
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Settings */}
            <aside className="rounded-2xl border border-line bg-surface p-5 shadow-sm lg:self-start">
              <h4 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold">
                <Images className="h-4 w-4 text-primary" /> Document settings
              </h4>
              <ToolSettings fields={tool.settings ?? []} values={settings} onChange={(k, v) => setSettings((s) => ({ ...s, [k]: v }))} />
            </aside>
          </div>
        </>
      )}

      {/* hidden Add Files input behind a dropzone trigger */}
      {items.length > 0 && (
        <UploadInLine accept={accept} multiple onFiles={addFiles} collapse />
      )}

      {!isProcessing && !isDone && (
        <div className="sticky bottom-4 z-20 rounded-2xl border border-line bg-surface/90 p-3 shadow-pop backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <p className="hidden pl-2 text-sm text-muted sm:block">
              {ready ? `${items.length} file${items.length === 1 ? '' : 's'} ready` : `Add at least ${tool.minFiles} image${tool.minFiles === 1 ? '' : 's'}`}
            </p>
            <Button
              size="lg"
              disabled={!ready}
              onClick={createPdf}
              loading={job.state === 'uploading'}
              className="w-full sm:w-auto sm:min-w-[160px]"
            >
              <Images className="h-4 w-4" /> Create PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink">
      {children}
    </button>
  );
}

function UploadInLine({
  accept,
  multiple,
  onFiles,
  collapse,
}: {
  accept: Accept;
  multiple: boolean;
  onFiles: (f: File[]) => void;
  collapse?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-line-strong p-3">
      <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} className={collapse ? 'hidden' : ''}>
        <FileUp className="h-4 w-4" /> Add more files
      </Button>
      <input
        id="add-files"
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={Object.keys(accept).join(',')}
        className="hidden"
        onChange={(e) => e.target.files && onFiles(Array.from(e.target.files))}
      />
    </div>
  );
}