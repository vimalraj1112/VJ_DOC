import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Combine, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import type { ToolDef } from '@/lib/tools';
import { useProcessJob } from '@/lib/useProcessJob';
import { formatBytes, uid } from '@/lib/utils';
import { FileUploader } from '@/components/tools/FileUploader';
import { ProcessPanel } from '@/components/tools/ProcessPanel';
import { ToolResult } from '@/components/tools/ToolResult';
import { Button } from '@/components/ui/Button';
import type { Accept } from 'react-dropzone';

interface Item {
  id: string;
  file: File;
}

export function MergeWorkflow({ tool }: { tool: ToolDef }) {
  const [items, setItems] = useState<Item[]>([]);
  const job = useProcessJob();

  const accept = useMemo<Accept>(() => ({ 'application/pdf': [] }), []);

  const add = (files: File[]) =>
    setItems((prev) => [...prev, ...files.slice(0, Math.max(tool.maxFiles - prev.length, 0)).map((file) => ({ id: uid(), file }))]);
  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
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

  const merge = () => job.run(tool.id, items.map((i) => i.file), {});

  if (isProcessing) return <ProcessPanel progress={job.progress} stage={job.stage} onCancel={job.cancel} />;
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
      <div
        className="relative overflow-hidden rounded-2xl border-2 border-dashed border-line-strong bg-surface"
      >
        {items.length === 0 ? (
          <div className="p-14">
            <FileUploader accept={accept} multiple maxFiles={tool.maxFiles} title="Drop your PDFs here" subtitle="Select the order, then merge them into one" onFiles={add} />
          </div>
        ) : null}
      </div>

      {items.length > 0 && (
        <FileUploaderBar accept={accept} onFiles={add} />
      )}

      <AnimatePresence>
        {items.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-sm font-semibold text-primary">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.file.name}</p>
                  <p className="text-xs text-faint">{formatBytes(item.file.size)}</p>
                </div>
                <div className="flex gap-1">
                  <button disabled={idx === 0} onClick={() => move(item.id, -1)} className="rounded p-1 text-muted hover:bg-surface-2 disabled:opacity-30" aria-label="Move up">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button disabled={idx === items.length - 1} onClick={() => move(item.id, 1)} className="rounded p-1 text-muted hover:bg-surface-2 disabled:opacity-30" aria-label="Move down">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(item.id)} className="rounded p-1 text-muted hover:bg-surface-2 hover:text-red-500" aria-label={`Remove ${item.file.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {items.length > 0 && !isProcessing && !isDone && (
        <div className="sticky bottom-4 z-20 rounded-2xl border border-line bg-surface/90 p-3 shadow-pop backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <p className="hidden pl-2 text-sm text-muted sm:block">{items.length} PDF{items.length === 1 ? '' : 's'} · order = final order</p>
            <Button size="lg" disabled={!ready} onClick={merge} loading={job.state === 'uploading'} className="w-full sm:w-auto sm:min-w-[160px]">
              <Combine className="h-4 w-4" /> Merge PDFs
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FileUploaderBar({ accept, onFiles }: { accept: Accept; onFiles: (f: File[]) => void }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong p-1">
      <FileUploader accept={accept} multiple title="Add more PDFs" subtitle="" onFiles={onFiles} />
    </div>
  );
}