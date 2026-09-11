import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Lock } from 'lucide-react';
import type { ToolDef } from '@/lib/tools';
import { cn } from '@/lib/utils';

export function ToolCard({ tool, index = 0 }: { tool: ToolDef; index?: number }) {
  const Icon = tool.icon;
  const Enabled = !tool.soon;

  const inner = (
    <motion.div
      whileHover={Enabled ? { y: -4 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'group relative h-full overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-sm)]',
        'transition-[border-color,box-shadow] duration-300',
        Enabled && 'cursor-pointer hover:border-line-strong hover:shadow-card',
        !Enabled && 'opacity-90',
      )}
    >
      {/* subtle hover glow */}
      {Enabled && (
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: `radial-gradient(circle, ${tool.accent[0]}33, transparent 70%)` }}
        />
      )}

      <div className="flex items-start justify-between">
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm transition-transform duration-300',
            Enabled && 'group-hover:-translate-y-0.5 group-hover:scale-105',
          )}
          style={{ background: `linear-gradient(135deg, ${tool.accent[0]}, ${tool.accent[1]})` }}
        >
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </div>
        {Enabled ? (
          <span className="rounded-full p-1.5 text-muted opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-faint">
            <Lock className="h-3 w-3" /> Soon
          </span>
        )}
      </div>

      <h3 className="mt-4 font-display text-[15px] font-semibold">{tool.name}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted">{tool.tagline}</p>
    </motion.div>
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.3) }}
      className="h-full"
    >
      {Enabled ? (
        <Link to={`/tools/${tool.id}`} className="block h-full">
          {inner}
        </Link>
      ) : (
        <div className="h-full">{inner}</div>
      )}
    </motion.div>
  );
}