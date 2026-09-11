import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'primary' | 'success' | 'warning' | 'danger';

export function Badge({ className, tone = 'default', ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  const tones: Record<Tone, string> = {
    default: 'bg-surface-2 text-muted border-line',
    primary: 'bg-primary-soft text-primary border-transparent',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400 border-transparent',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}