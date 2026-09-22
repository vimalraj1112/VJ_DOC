import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileSignature, Check, AlertTriangle, Clock, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getSignatureRequest, signSignatureRequest, apiErrorMessage } from '@/lib/api';
import type { SignatureRequestView } from '@/lib/types';

export function SignPage() {
  const { token = '' } = useParams();
  const [view, setView] = useState<SignatureRequestView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getSignatureRequest(token)
      .then((data) => {
        if (active) setView(data);
      })
      .catch((err) => {
        if (active) setError(apiErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const doSign = async () => {
    if (!view || !name.trim() || signing) return;
    setSigning(true);
    setError(null);
    try {
      const blob = await signSignatureRequest(token, name.trim());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = view.documentTitle || 'signed-document.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setSigned(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSigning(false);
    }
  };

  const status = view?.status;

  return (
    <section className="mx-auto w-full max-w-xl px-4 py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
      >
        <div className="border-b border-line bg-surface-2/60 px-6 py-6 text-center sm:px-8">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-fg">
            <FileSignature className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Sign a document</h1>
          <p className="mt-1 text-sm text-muted">
            You&rsquo;ve been asked to sign &ldquo;{view?.documentTitle ?? 'a document'}&rdquo;.
          </p>
        </div>

        <div className="px-6 py-6 sm:px-8">
          {loading && (
            <p className="py-6 text-center text-sm text-muted">Loading this signing request…</p>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <p className="text-sm text-muted">{error}</p>
            </div>
          )}

          {!loading && !error && status === 'PENDING' && (
            <>
              {view?.signerName && (
                <p className="mb-4 rounded-xl bg-surface-2/60 px-4 py-3 text-sm text-muted">
                  This document is addressed to <span className="font-semibold text-ink">{view.signerName}</span>.
                </p>
              )}
              <label className="mb-1.5 block text-sm font-medium" htmlFor="signer-name">
                Type your full name to sign
              </label>
              <input
                id="signer-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Cooper"
                className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              />
              {signed && (
                <p className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Check className="h-4 w-4" /> Signed — your copy is downloading.
                </p>
              )}
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              <Button
                size="lg"
                className="mt-4 w-full"
                disabled={!name.trim() || signing}
                loading={signing}
                onClick={doSign}
              >
                {signed ? <Check className="h-4 w-4" /> : <PenLine className="h-4 w-4" />}
                {signed ? 'Downloaded — thanks!' : 'Sign & download'}
              </Button>
              <p className="mt-4 text-xs text-muted">
                Signing applies your name as a typed signature and locks the document. You&rsquo;ll receive the
                signed PDF immediately.
              </p>
            </>
          )}

          {!loading && !error && status && status !== 'PENDING' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              {status === 'SIGNED' ? (
                <>
                  <Check className="h-8 w-8 text-emerald-500" />
                  <p className="text-sm font-medium">Already signed</p>
                  <p className="text-sm text-muted">This document was signed on {view?.signedAt} — no further action is needed.</p>
                </>
              ) : status === 'EXPIRED' ? (
                <>
                  <Clock className="h-8 w-8 text-amber-500" />
                  <p className="text-sm font-medium">This signing link has expired</p>
                  <p className="text-sm text-muted">Ask the sender to create a new signing request.</p>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                  <p className="text-sm font-medium">This signing request was cancelled</p>
                  <p className="text-sm text-muted">Ask the sender for a new link.</p>
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
}