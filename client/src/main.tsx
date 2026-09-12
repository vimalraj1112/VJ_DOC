import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initTheme } from '@/store/theme';
import '@/styles/index.css';

// Force-import the pdf utils so its worker setup runs (see lib/pdf.ts).
import '@/lib/pdf';

// Apply the persisted theme before first paint.
initTheme();

// Register the service worker so VJ_DOC is installable and works offline.
// Skipped in dev to avoid caching churn; the Prod build controls its own cache.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);