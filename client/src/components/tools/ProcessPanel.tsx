import { motion } from 'framer-motion';
import { Check, Loader2, X } from 'lucide-react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const STAGES = ['Uploading', 'Analyzing', 'Processing pages', 'Optimizing', 'Finalizing', 'Ready'];

interface ProcessPanelProps {
  progress: number;
  stage: string;
  onCancel?: () => void;
  canCancel?: boolean;
}

export function ProcessPanel({ progress, stage, onCancel, canCancel = true }: ProcessPanelProps) {
  const pct = Math.round(progress);
  const currentIndex = STAGES.findIndex((s) => stage.toLowerCase().startsWith(s.toLowerCase().slice(0, 6)));
  const reached = Math.max(0, currentIndex >= 0 ? currentIndex : STAGES.findIndex((s) => pct / 100 < (STAGES.indexOf(s) + 1) / STAGES.length));

  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-line bg-surface p-8 text-center shadow-card">
      <div className="relative mx-auto grid h-28 w-28 place-items-center">
        {/* progress ring */}
        <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--line)" strokeWidth="6" />
          <motion.circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="url(#prg)"
            strokeWidth="6"
            strokeLinecap="round"
            style={{ strokeDasharray: 2 * Math.PI * 44 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 44 * (1 - pct / 100) }}
            transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          />
          <defs>
            <linearGradient id="prg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--secondary)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute font-display text-2xl font-bold tabular-nums">{pct}%</div>
      </div>

      <h3 className="mt-5 font-display text-lg font-semibold">{stage || 'Working…'}</h3>

      <div className="mx-auto mt-4 max-w-xs">
        <ProgressBar value={pct} />
      </div>

      <ul className="mx-auto mt-6 grid max-w-xs grid-cols-2 gap-x-4 gap-y-2 text-left text-sm">
        {STAGES.map((s) => {
          const done = pct >= 100;
          const active = !done && (s === STAGES[reached] || pct >= ((STAGES.indexOf(s) + 1) / STAGES.length) * 100);
          return (
            <li key={s} className={cn('flex items-center gap-2 transition-opacity', done ? 'opacity-100' : active ? 'opacity-100' : 'opacity-40')}>
              {done || active ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-faint" />
              )}
              <span className={cn(active && 'font-medium')}>{s}</span>
            </li>
          );
        })}
      </ul>

      {canCancel && onCancel && (
        <Button variant="secondary" className="mt-7" onClick={onCancel}>
          <X className="h-4 w-4" /> Cancel
        </Button>
      )}
    </div>
  );
}