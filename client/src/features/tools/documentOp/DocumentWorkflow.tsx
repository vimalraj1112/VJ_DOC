import { useMemo, useState } from 'react';
import { FileText, Wand2 } from 'lucide-react';
import type { Accept } from 'react-dropzone';
import type { ToolDef } from '@/lib/tools';
import { useProcessJob } from '@/lib/useProcessJob';
import { formatBytes } from '@/lib/utils';
import { FileUploader } from '@/components/tools/FileUploader';
import { ProcessPanel } from '@/components/tools/ProcessPanel';
import { ToolResult } from '@/components/tools/ToolResult';
import { Button } from '@/components/ui/Button';

/**
 * Minimal single-PDF workflow for the documentOp tools (Extract Text,
 * Remove Metadata). No settings — pick a PDF, run, download the result.
 */
export function DocumentWorkflow({ tool }: { tool: ToolDef }) {
  const [file, setFile] = useState<File | null>(null);
  const job = useProcessJob();

  const accept = useMemo<Accept>(() => ({ 'application/pdf': [] }), []);
  const isProcessing = job.state === 'processing' || job.state === 'uploading';
  const isDone = job.state === 'completed';

  const onFile = (files: File[]) => setFile(files[0] ?? null);

  const process = () => {
    if (!file) return;
    job.run(tool.id, [file], {});
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
      )}

      {file && !isProcessing && !isDone && (
        <div className="sticky bottom-4 z-20 rounded-2xl border border-line bg-surface/90 p-3 shadow-pop backdrop-blur-xl">
          <Button size="lg" disabled={!file} onClick={process} loading={job.state === 'uploading'} className="w-full sm:w-auto sm:min-w-[180px]">
            <Wand2 className="h-4 w-4" /> {tool.name}
          </Button>
        </div>
      )}
    </div>
  );
}