import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initTheme } from '@/store/theme';
import '@/styles/index.css';

// Force-import the pdf utils so its worker setup runs (see lib/pdf.ts).
import '@/lib/pdf';

// Apply the persisted theme before first paint.
initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);