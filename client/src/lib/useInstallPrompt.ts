import { useCallback, useEffect, useState } from 'react';

/** `beforeinstallprompt` isn't in the standard libs yet — declare it here. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/** True when the app is already running installed (standalone or iOS home-screen). */
function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Exposes a deferrable PWA install prompt. Chrome fires `beforeinstallprompt`
 * once the site is installable; we capture it and surface it to the UI instead
 * of Chrome's default mini-infobar so it can be styled and dismissible.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const canInstall = deferred !== null;

  const promptInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') setDeferred(null);
  }, [deferred]);

  const dismiss = useCallback(() => setDeferred(null), []);

  return { canInstall, promptInstall, dismiss };
}