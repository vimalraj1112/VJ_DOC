import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Wand2 } from 'lucide-react';
import type { ToolDef } from '@/lib/tools';
import { useProcessJob } from '@/lib/useProcessJob';
import { formatBytes } from '@/lib/utils';
import { FileUploader } from '@/components/tools/FileUploader';
import { ToolSettings } from '@/components/tools/ToolSettings';
import { ProcessPanel } from '@/components/tools/ProcessPanel';
import { ToolResult } from '@/components/tools/ToolResult';
import { Button } from '@/components/ui/Button';
import type { Accept } from 'react-dropzone';

/**
 * Generic single-PDF, settings-driven workflow used by the "pdfOp" tools
 * (Rotate, Watermark, Add Page Numbers, Compress, Sign). All of them:
 *   1. upload one PDF,
 *   2. pick settings from `tool.settings`,
 *   3. run the server processor and show the resulting file.
 */
export function PdfOpWorkflow({ tool }: { tool: ToolDef }) {
  const [file, setFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<Record<string, string | number>>(() =>
    Object.fromEntries((tool.settings ?? []).map((s) => [s.key, s.default])),
  );
  const job = useProcessJob();

  const accept = useMemo<Accept>(() => ({ 'application/pdf': [] }), []);
  const isProcessing = job.state === 'processing' || job.state === 'uploading';
  const isDone = job.state === 'completed';

  const onFile = (files: File[]) => setFile(files[0] ?? null);

  const process = () => {
    if (!file) return;
    job.run(tool.id, [file], settings);
  };

  if (isProcessing) return <ProcessPanel progress={job.progress} stage={job.stage} onCancel={job.cancel} />;
  if (isDone && job.result) {
    return (
      <ToolResult
        files={job.result.outputFiles}
        onAnother={() => {
          job.reset();
          setFile(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {!file ? (
        <FileUploader accept={accept} multiple={false} title="Drop your PDF here" subtitle="Choose a PDF to work with" onFiles={onFile} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div>
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-red-500/10 text-red-500">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted">{formatBytes(file.size)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                Change
              </Button>
            </div>
          </div>

          <aside className="rounded-2xl border border-line bg-surface p-5 shadow-sm lg:self-start">
            <h4 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold">
              <Wand2 className="h-4 w-4 text-primary" /> Settings
            </h4>
            <ToolSettings fields={tool.settings ?? []} values={settings} onChange={(k, v) => setSettings((s) => ({ ...s, [k]: v }))} />
          </aside>
        </div>
      )}

      {file && !isProcessing && !isDone && (
        <div className="sticky bottom-4 z-20 rounded-2xl border border-line bg-surface/90 p-3 shadow-pop backdrop-blur-xl">
          <Button size="lg" disabled={!file} onClick={process} loading={job.state === 'uploading'} className="w-full sm:w-auto sm:min-w-[160px]">
            {tool.name}
          </Button>
        </div>
      )}
    </div>
  );
}