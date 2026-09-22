import { useCallback, useState } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import { motion } from 'framer-motion';
import { CloudUpload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  accept: Accept;
  multiple: boolean;
  maxFiles?: number;
  disabled?: boolean;
  title?: string;
  subtitle?: string;
  hint?: string;
  onFiles: (files: File[]) => void;
}

const ACCEPT_LABEL: Record<string, string> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/webp': 'WEBP',
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
};

export function FileUploader({
  accept,
  multiple,
  maxFiles,
  disabled,
  title = 'Drop a document here',
  subtitle = 'or choose a file from your device',
  hint,
  onFiles,
}: FileUploaderProps) {
  const [dragging, setDragging] = useState(false);

  const onDrop = useCallback(
    (accepted: File[]) => {
      setDragging(false);
      if (!accepted.length) return;
      onFiles(accepted.slice(0, maxFiles ?? accepted.length));
    },
    [maxFiles, onFiles],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxFiles,
    disabled,
    noClick: true,
    onDragEnter: () => setDragging(true),
    onDragLeave: () => setDragging(false),
  });

  const strongDrag = isDragActive || dragging;
  const labels = Object.keys(accept).map((k) => ACCEPT_LABEL[k] ?? k).filter(Boolean);

  return (
    <motion.div
      animate={{ scale: strongDrag ? 1.01 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={cn(
        'relative overflow-hidden rounded-2xl border-2 border-dashed text-center transition-colors duration-200',
        strongDrag ? 'border-primary bg-primary-soft' : 'border-line-strong bg-surface',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      {/* Dropzone props live on a display:contents wrapper so the motion element
          above keeps its own (non-conflicting) animation props. */}
      <div
        {...getRootProps()}
        className="flex cursor-pointer flex-col items-center justify-center px-6 py-14"
      >
        <input {...getInputProps()} />
        <div
          className={cn(
            'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300',
            strongDrag && 'opacity-100',
          )}
          style={{ background: 'radial-gradient(closest-side, var(--primary-soft), transparent 75%)' }}
        />

        <motion.div
          animate={strongDrag ? { y: -6, scale: 1.1 } : { y: 0, scale: 1 }}
          className={cn('grid h-16 w-16 place-items-center rounded-2xl transition-colors', strongDrag ? 'bg-primary text-white' : 'bg-primary-soft text-primary')}
        >
          {strongDrag ? <X className="h-7 w-7 rotate-45" /> : <CloudUpload className="h-7 w-7" strokeWidth={1.6} />}
        </motion.div>

        <h3 className="mt-5 font-display text-lg font-semibold">{strongDrag ? 'Drop your files here' : title}</h3>
        <p className="mt-1 text-sm text-muted">{strongDrag ? "We'll take it from here." : subtitle}</p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
          className="mt-6 rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
        >
          Choose files
        </button>

        {labels.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
            {labels.map((l) => (
              <span key={l} className="rounded-md bg-surface-2 px-2 py-1 text-xs font-medium text-muted">
                {l}
              </span>
            ))}
            {hint && <span className="text-xs text-faint">{hint}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}