import { AnimatePresence, motion } from 'framer-motion';
import { Smartphone, X } from 'lucide-react';
import { useInstallPrompt } from '@/lib/useInstallPrompt';
import { Button } from '@/components/ui/Button';

/** Dismissible banner inviting the user to install VJ_DOC as an app. */
export function InstallBanner() {
  const { canInstall, promptInstall, dismiss } = useInstallPrompt();

  return (
    <AnimatePresence>
      {canInstall && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="mx-auto w-full max-w-5xl px-4"
        >
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-surface/95 px-4 py-3 shadow-pop backdrop-blur-xl">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Smartphone className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Install VJ_DOC</p>
              <p className="truncate text-xs text-muted">Run it as an app with one tap — faster and offline-ready.</p>
            </div>
            <Button size="sm" onClick={promptInstall}>
              Install
            </Button>
            <button
              onClick={dismiss}
              aria-label="Dismiss install prompt"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}