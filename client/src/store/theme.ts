import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'vj_doc.theme';

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function resolve(pref: ThemePreference): ResolvedTheme {
  return pref === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : pref;
}

function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? '#09090B' : '#FAFAFC');
  }
}

interface ThemeState {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  /** Active theme, exposed for components that need to know. */
  resolved: ResolvedTheme;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      preference: 'system',
      resolved: 'light',
      setPreference: (preference) => {
        applyTheme(resolve(preference));
        set({ preference, resolved: resolve(preference) });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({ preference: s.preference }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const resolved = resolve(state.preference);
        applyTheme(resolved);
        if (state.resolved !== resolved) state.resolved = resolved;
      },
    },
  ),
);

/** Wire the system theme listener once at boot. */
export function initTheme(): void {
  const pref = useTheme.getState().preference;
  applyTheme(resolve(pref));
  useTheme.setState({ resolved: resolve(pref) });

  if (typeof window !== 'undefined') {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener?.('change', () => {
      if (useTheme.getState().preference === 'system') {
        const resolved = resolve('system');
        applyTheme(resolved);
        useTheme.setState({ resolved });
      }
    });
  }
}