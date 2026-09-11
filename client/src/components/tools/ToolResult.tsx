import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Download, RefreshCw, Share2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { formatBytes } from '@/lib/utils';
import { downloadFile, apiErrorMessage } from '@/lib/api';
import { fileDownloadUrl, type FileResult } from '@/lib/types';

interface ToolResultProps {
  files: FileResult[];
  highlightName?: string;
  onAnother: () => void;
}

export function ToolResult({ files, highlightName, onAnother }: ToolResultProps) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const primary = files[0];

  const handleDownload = async (file: FileResult) => {
    if (downloading) return;
    setDownloading(file.id);
    try {
      const blob = await downloadFile(fileDownloadUrl(file));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast.success('Download started');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDownloading(null);
    }
  };

  const handleShare = async (file: FileResult) => {
    const url = `${window.location.origin}${fileDownloadUrl(file)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Download link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface text-center shadow-card"
    >
      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 px-6 pb-6 pt-10">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white shadow-lg"
        >
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Check strokeWidth={3} className="h-8 w-8" />
          </motion.div>
        </motion.div>
        <h3 className="mt-5 font-display text-2xl font-bold">{highlightName ? `${highlightName} ready` : 'Your PDF is ready'}</h3>
        <p className="mt-1 text-sm text-muted">Forged and processed — download it below.</p>
      </div>

      <div className="px-6 py-6">
        <div className="mb-6 flex items-center justify-between rounded-xl border border-line bg-surface-2/50 px-4 py-3">
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-medium">{primary?.name}</p>
            <p className="text-xs text-muted">
              {formatBytes(primary?.size ?? 0)}
              {primary?.pages ? ` · ${primary.pages} page${primary.pages === 1 ? '' : 's'}` : ''}
            </p>
          </div>
          <Button size="sm" onClick={() => handleDownload(primary)} loading={downloading === primary?.id}>
            <Download className="h-4 w-4" /> Download
          </Button>
        </div>

        {files.length > 1 && (
          <div className="mb-5 space-y-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                <span className="truncate text-muted">{f.name}</span>
                <Button size="xs" variant="secondary" onClick={() => handleDownload(f)} loading={downloading === f.id}>
                  <Download className="h-3.5 w-3.5" /> File {formatBytes(f.size)}
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" onClick={() => handleShare(primary)}>
            <Share2 className="h-4 w-4" /> Share
            <Link2 className="ml-auto h-4 w-4 text-faint" />
          </Button>
          <Button size="lg" variant="outline" onClick={onAnother}>
            <RefreshCw className="h-4 w-4" /> Create another
          </Button>
        </div>

        <p className="mt-5 text-xs text-faint">Downloads are private and auto-delete after 24 hours.</p>
      </div>
    </motion.div>
  );
}