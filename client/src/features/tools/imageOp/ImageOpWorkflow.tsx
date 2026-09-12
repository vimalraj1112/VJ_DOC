import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, Images, Wand2 } from 'lucide-react';
import type { Accept } from 'react-dropzone';
import type { ToolDef } from '@/lib/tools';
import { useProcessJob } from '@/lib/useProcessJob';
import { formatBytes, uid } from '@/lib/utils';
import { FileUploader } from '@/components/tools/FileUploader';
import { ToolSettings } from '@/components/tools/ToolSettings';
import { ProcessPanel } from '@/components/tools/ProcessPanel';
import { ToolResult } from '@/components/tools/ToolResult';
import { Button } from '@/components/ui/Button';

/**
 * Generic multi-image, settings-driven workflow for the "imageOp" tools
 * (WEBP↔PNG↔JPG transcodes, Resize, Crop). Each input image produces one
 * output file — a batch comes back as a list of downloadable files.
 */
export function ImageOpWorkflow({ tool }: { tool: ToolDef }) {
  const [items, setItems] = useState<{ id: string; file: File }[]>([]);
  const [settings, setSettings] = useState<Record<string, string | number>>(() =>
    Object.fromEntries((tool.settings ?? []).map((s) => [s.key, s.default])),
  );
  const job = useProcessJob();

  const accept = useMemo<Accept>(() => ({ [tool.accept]: [] }), [tool.accept]);
  const hasSettings = (tool.settings?.length ?? 0) > 0;

  const addFiles = (incoming: File[]) =>
    setItems((prev) => [
      ...prev,
      ...incoming.map((file) => ({ id: uid(), file })).slice(0, tool.maxFiles - prev.length),
    ]);

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const ready = items.length >= tool.minFiles;
  const isProcessing = job.state === 'processing' || job.state === 'uploading';
  const isDone = job.state === 'completed';

  const process = () => {
    if (!ready) return;
    job.run(tool.id, items.map((i) => i.file), settings);
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
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-muted">
                {items.length} image{items.length === 1 ? '' : 's'} selected
              </p>
              <Button variant="ghost" size="sm" onClick={() => setItems([])}>
                Clear
              </Button>
            </div>

            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group relative overflow-hidden rounded-xl border border-line bg-surface"
                  >
                    <div className="relative aspect-[4/3] bg-surface-2">
                      <img
                        src={item.file instanceof File ? URL.createObjectURL(item.file) : ''}
                        alt={item.file.name}
                        className="h-full w-full object-contain p-2"
                      />
                      <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
                        {items.findIndex((i) => i.id === item.id) + 1}
                      </span>
                      <button
                        onClick={() => remove(item.id)}
                        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-black/60 text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
                        aria-label={`Remove ${item.file.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{item.file.name}</p>
                        <p className="text-[11px] text-faint">{formatBytes(item.file.size)}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {hasSettings && (
            <aside className="rounded-2xl border border-line bg-surface p-5 shadow-sm lg:self-start">
              <h4 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold">
                <Wand2 className="h-4 w-4 text-primary" /> Settings
              </h4>
              <ToolSettings fields={tool.settings ?? []} values={settings} onChange={(k, v) => setSettings((s) => ({ ...s, [k]: v }))} />
            </aside>
          )}
        </div>
      )}

      {!isProcessing && !isDone && (
        <div className="sticky bottom-4 z-20 rounded-2xl border border-line bg-surface/90 p-3 shadow-pop backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <p className="hidden pl-2 text-sm text-muted sm:block">
              {ready ? `${items.length} file${items.length === 1 ? '' : 's'} ready` : `Add at least ${tool.minFiles} image${tool.minFiles === 1 ? '' : 's'}`}
            </p>
            <Button size="lg" disabled={!ready} onClick={process} loading={job.state === 'uploading'} className="w-full sm:w-auto sm:min-w-[160px]">
              <Images className="h-4 w-4" /> {tool.name}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}