import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link2, Copy, Check, ExternalLink, RotateCcw, FileSignature } from 'lucide-react';
import { FileUploader } from '@/components/tools/FileUploader';
import { ToolSettings } from '@/components/tools/ToolSettings';
import { Button } from '@/components/ui/Button';
import { requestSignature, apiErrorMessage } from '@/lib/api';
import type { ToolDef } from '@/lib/tools';
import type { SignatureRequestCreated } from '@/lib/types';

export function RequestSignatureWorkflow({ tool }: { tool: ToolDef }) {
  const [file, setFile] = useState<File | null>(null);
  const [values, setValues] = useState<Record<string, string | number>>(() =>
    Object.fromEntries((tool.settings ?? []).map((s) => [s.key, s.default])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<SignatureRequestCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const signerName = String(values.signerName ?? '').trim();
  const ready = Boolean(file) && Boolean(signerName);

  const createRequest = async () => {
    if (!file || !signerName) return;
    setBusy(true);
    setError(null);
    try {
      const result = await requestSignature([file], values);
      setCreated(result);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.signingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const reset = () => {
    setFile(null);
    setCreated(null);
    setError(null);
  };

  if (created) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-600 text-white">
              <Link2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-display text-lg font-semibold">Your signing link is ready</h4>
              <p className="text-sm text-muted">
                Share it with {created.signerName || 'the recipient'} — no accounts or app install needed.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm text-muted">{created.signingUrl}</span>
              <button
                onClick={copyLink}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                aria-label="Copy signing link"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <Button onClick={copyLink} variant="primary">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => window.open(created.signingUrl, '_blank', 'noopener,noreferrer')}>
              <ExternalLink className="h-4 w-4" /> Open signing page
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Request another
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm font-medium">
            {`“${created.documentTitle}” is ready for ${created.signerName}`}
          </p>
          <p className="mt-1 text-sm text-muted">
            When they sign, their signed PDF is returned through the same link — you don't need to do anything.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      {!file ? (
        <FileUploader
          accept={{ 'application/pdf': [] }}
          multiple={false}
          title={`Drop your ${tool.acceptHint?.toLowerCase() || 'PDF'} here`}
          subtitle={tool.tagline}
          onFiles={(files) => setFile(files[0] ?? null)}
        />
      ) : (
        <>
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted">A clear copy must be uploaded — the PDF will not be altered.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
              Change
            </Button>
          </div>

          <aside className="rounded-2xl border border-line bg-surface p-5 lg:self-start">
            <h4 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold">
              <FileSignature className="h-4 w-4 text-primary" /> Who should sign
            </h4>
            <ToolSettings
              fields={tool.settings ?? []}
              values={values}
              onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
            />
          </aside>
        </>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">{error}</p>}

      {file && (
        <div className="sticky bottom-4 z-20 rounded-2xl border border-line bg-surface/90 p-3 shadow-pop backdrop-blur-xl">
          <Button size="lg" disabled={!ready || busy} loading={busy} onClick={createRequest} className="w-full sm:w-auto">
            Create signing link
          </Button>
          {!ready && file && (
            <p className="mt-2 px-1 text-xs text-muted">Type a name for the person who should sign.</p>
          )}
        </div>
      )}
    </div>
  );
}
