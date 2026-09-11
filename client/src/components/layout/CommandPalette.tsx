import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, Search, ArrowUpRight } from 'lucide-react';
import { TOOLS, CATEGORY_META } from '@/lib/tools';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/utils';

const QUICK = [
  { to: '/tools', label: 'Browse all tools' },
  { to: '/pricing', label: 'View pricing' },
];

export function CommandPalette() {
  const { commandOpen, setCommandOpen } = useUi();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setCommandOpen]);

  useEffect(() => {
    if (commandOpen) {
      setQuery('');
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [commandOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tools = TOOLS.filter(
      (t) => !q || t.name.toLowerCase().includes(q) || t.tagline.toLowerCase().includes(q) || CATEGORY_META[t.category].label.toLowerCase().includes(q),
    );
    return tools.slice(0, 8).map((t) => ({ id: t.id, kind: 'tool' as const, label: t.name, sub: t.tagline, to: `/tools/${t.id}`, soon: t.soon }));
  }, [query]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!commandOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const at = results[index];
        if (at) {
          setCommandOpen(false);
          if (!at.soon) nav(at.to);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commandOpen, results, index, nav, setCommandOpen]);

  return (
    <AnimatePresence>
      {commandOpen && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCommandOpen(false)} />
          <motion.div
            initial={{ y: -8, opacity: 0, scale: 0.995 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0, scale: 0.995 }}
            transition={{ duration: 0.16 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tools…"
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-faint"
                aria-label="Search tools"
              />
              <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] text-faint">esc</kbd>
            </div>
            <div className="max-h-[40vh] overflow-y-auto p-2">
              {results.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted">No tools match “{query}”.</p>
              )}
              {results.map((r, i) => (
                <button
                  key={r.id}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => {
                    setCommandOpen(false);
                    if (!r.soon) nav(r.to);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                    i === index && 'bg-surface-2',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{r.label}</span>
                    <span className="block truncate text-xs text-muted">{r.sub}</span>
                  </span>
                  {r.soon ? (
                    <span className="text-[11px] text-faint">Soon</span>
                  ) : (
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-faint" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-line bg-surface-2/50 px-4 py-2.5 text-[11px] text-faint">
              <span className="flex items-center gap-1.5">
                <CornerDownLeft className="h-3 w-3" /> to open
              </span>
              <div className="flex gap-3">
                {QUICK.map((q) => (
                  <button
                    key={q.to}
                    onClick={() => {
                      setCommandOpen(false);
                      nav(q.to);
                    }}
                    className="hover:text-ink"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}