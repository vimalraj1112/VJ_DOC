import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ShieldCheck, Hourglass } from 'lucide-react';
import { Meta } from '@/components/Meta';
import { Badge } from '@/components/ui/Badge';
import { ToolCard } from '@/components/ui/ToolCard';
import { NotFound } from '@/pages/NotFound';
import { getTool, relatedTools, CATEGORY_META } from '@/lib/tools';
import { workflowFor } from '@/features/tools/workflows';

export function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = toolId ? getTool(toolId) : undefined;

  if (!tool) return <NotFound />;

  const Workflow = workflowFor(tool.kind);
  const cat = CATEGORY_META[tool.category];
  const related = relatedTools(tool);

  return (
    <main className="mx-auto w-full max-w-7xl px-5 pb-24 sm:px-6">
      <Meta title={`${tool.name} — Free online tool | VJ_DOC`} description={tool.description} />

      {/* breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 pt-24 text-sm text-faint sm:pt-28"
      >
        <Link to="/" className="transition-colors hover:text-ink">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/tools" className="transition-colors hover:text-ink">
          Tools
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-muted">{tool.name}</span>
      </nav>

      {/* header */}
      <header className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="grid h-16 w-16 place-items-center rounded-2xl text-white shadow-card"
          style={{ background: `linear-gradient(135deg, ${tool.accent[0]}, ${tool.accent[1]})` }}
        >
          <tool.icon className="h-8 w-8" strokeWidth={1.7} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{tool.name}</h1>
            <Badge tone="primary">{cat.label}</Badge>
          </div>
          <p className="mt-2 max-w-2xl text-muted sm:text-lg">{tool.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Private · no sign-up
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Hourglass className="h-3.5 w-3.5" /> Files auto-delete after 24 h
            </span>
          </div>
        </motion.div>
      </header>

      {/* workflow */}
      <section className="mt-10" aria-label="Tool workspace">
        {Workflow ? (
          <Workflow tool={tool} />
        ) : (
          <div className="rounded-2xl border border-dashed border-line-strong bg-surface/50 px-6 py-16 text-center">
            <p className="font-display text-xl font-semibold">Coming soon</p>
            <p className="mt-2 text-sm text-muted">
              We&apos;re forging {tool.name} right now. Bring it back soon.
            </p>
            <Link
              to="/tools"
              className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover"
            >
              Browse all tools
            </Link>
          </div>
        )}
      </section>

      {/* related */}
      {related.length > 0 && (
        <section className="mt-20" aria-label="Related tools">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">Related tools</h2>
              <p className="mt-1 text-sm text-muted">Keep going — pair {tool.name} with these.</p>
            </div>
            <Link
              to="/tools"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary-soft sm:block"
            >
              Browse all →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((t, i) => (
              <ToolCard key={t.id} tool={t} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {tool.faq && tool.faq.length > 0 && (
        <section className="mt-20" aria-label="Frequently asked questions">
          <h2 className="font-display text-2xl font-bold tracking-tight">Questions</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {tool.faq.map((item) => (
              <div key={item.q} className="rounded-2xl border border-line bg-surface p-5">
                <h3 className="font-display text-base font-semibold">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}