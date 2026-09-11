import { motion } from 'framer-motion';
import { Meta } from '@/components/Meta';
import { ToolCard } from '@/components/ui/ToolCard';
import { CATEGORY_META, CATEGORY_ORDER, toolsByCategory } from '@/lib/tools';

export function Tools() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 pb-24 pt-24 sm:px-6 sm:pt-28">
      <Meta
        title="All PDF tools — free & private | VJ_DOC"
        description="Convert, merge, split, compress and secure PDFs. Every tool is free, private and works right in your browser — no sign-up needed."
      />

      <header className="max-w-2xl">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="font-display text-4xl font-bold tracking-tight sm:text-5xl"
        >
          All PDF tools
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mt-3 text-lg text-muted"
        >
          Everything you need to convert, combine, optimise and guard your documents — for free, with no sign-up and total privacy.
        </motion.p>
      </header>

      <div className="mt-12 space-y-14">
        {CATEGORY_ORDER.map((cat) => {
          const tools = toolsByCategory(cat);
          if (!tools.length) return null;
          const meta = CATEGORY_META[cat];
          const working = tools.filter((t) => !t.soon).length;
          return (
            <section key={cat} aria-labelledby={`cat-${cat}`}>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 id={`cat-${cat}`} className="font-display text-2xl font-bold tracking-tight">
                    {meta.label}
                  </h2>
                  <p className="mt-1 text-sm text-muted">{meta.blurb}</p>
                </div>
                <span className="hidden shrink-0 text-xs text-faint sm:block">
                  {working} of {tools.length} ready
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((t, i) => (
                  <ToolCard key={t.id} tool={t} index={i} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}