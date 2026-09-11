import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CloudLightning, Sparkles, ShieldCheck, Timer, MonitorSmartphone, Lock } from 'lucide-react';
import { Meta } from '@/components/Meta';
import { Badge } from '@/components/ui/Badge';
import { ToolCard } from '@/components/ui/ToolCard';
import { Button } from '@/components/ui/Button';
import { FileUploader } from '@/components/tools/FileUploader';
import { ProcessPanel } from '@/components/tools/ProcessPanel';
import { ToolResult } from '@/components/tools/ToolResult';
import { useProcessJob } from '@/lib/useProcessJob';
import { workingTools, CATEGORY_META, getTool } from '@/lib/tools';
import { workflowFor } from '@/features/tools/workflows';
import type { Accept } from 'react-dropzone';

/* Self-contained hero converter: drop an image → real PDF conversion runs */
function HeroConverter() {
  const [file, setFile] = useState<File | null>(null);
  const job = useProcessJob();
  const accept = useMemo<Accept>(
    () => ({ 'image/png': [], 'image/jpeg': [], 'image/webp': [] }),
    [],
  );

  const onFiles = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    const isPng = f.type === 'image/png';
    const toolId = isPng ? 'png-to-pdf' : f.type === 'image/webp' ? 'webp-to-pdf' : 'jpg-to-pdf';
    job.run(toolId, [f], {});
  };

  const isProcessing = job.state === 'processing' || job.state === 'uploading';

  if (isProcessing) return <ProcessPanel progress={job.progress} stage={job.stage} onCancel={job.cancel} />;

  if (job.state === 'completed' && job.result) {
    return (
      <ToolResult
        files={job.result.outputFiles}
        highlightName={file?.name.slice(0, -4) ?? undefined}
        onAnother={() => {
          job.reset();
          setFile(null);
        }}
      />
    );
  }

  if (job.state === 'failed' && job.error) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center">
        <p className="font-display text-lg font-semibold text-red-600 dark:text-red-400">Something went wrong</p>
        <p className="mt-1 text-sm text-muted">{job.error}</p>
        <Button variant="secondary" size="lg" className="mt-6" onClick={() => { job.reset(); setFile(null); }}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <FileUploader
      accept={accept}
      multiple={false}
      title="Drop an image to convert to PDF"
      subtitle="PNG, JPG or WEBP — converts right here in your browser"
      onFiles={onFiles}
    />
  );
}

const STEPS = [
  { n: '01', title: 'Drop your files', text: 'Drag & drop any document onto the tool of your choice. No account, no sign-up, no friction.' },
  { n: '02', title: 'We forge & process', text: 'Your files are turned into polished PDFs on a fast, private pipeline. Live progress as it works.' },
  { n: '03', title: 'Download and go', text: 'Grab your finished file instantly. Everything auto-deletes within 24 hours.' },
];

const TRUST = [
  { icon: ShieldCheck, title: 'Private by design', text: 'Files are never shared, scanned or sold. Auto-deleted within 24 hours.' },
  { icon: Timer, title: 'No sign-up', text: 'Just drop, process and download. Your documents, your time.' },
  { icon: MonitorSmartphone, title: 'Made for every screen', text: 'Equally at home on your phone, tablet or desktop browser.' },
  { icon: Lock, title: 'Secure processing', text: 'Files are validated by their real content, never by their name.' },
];

export function Home() {
  const popular = workingTools().slice(0, 6);
  const flagship = getTool('jpg-to-pdf') ?? popular[0];
  const Prize = flagship ? workflowFor(flagship.kind) : null;

  return (
    <main className="w-full">
      <Meta
        title="VJ_DOC — Forge every document into something better"
        description="Free, private, all-in-one PDF tools. Convert, merge, split, compress and protect your documents in the browser — no sign-up ever."
      />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-5 pb-16 pt-28 sm:px-6 sm:pt-32">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-glow" />
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-[0.5]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge tone="primary" className="mb-5 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5" /> All-in-one PDF workspace
            </Badge>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Forge every document into{' '}
              <span className="text-gradient">something better.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted sm:text-xl">
              Convert, merge, split and protect PDFs in seconds. Free, private and right in your browser — no sign-up, ever.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/tools/png-to-pdf">
                <Button size="lg">Convert PNG → PDF</Button>
              </Link>
              <Link to="/tools">
                <Button size="lg" variant="secondary">
                  Explore all tools
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-faint">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> 100% private</span>
              <span className="inline-flex items-center gap-1.5"><Timer className="h-4 w-4" /> No sign-up</span>
              <span className="inline-flex items-center gap-1.5"><CloudLightning className="h-4 w-4" /> 1-click convert</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative"
          >
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/10 to-secondary/10 blur-2xl" />
            <HeroConverter />
          </motion.div>
        </div>
      </section>

      {/* ── Popular tools ────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">Popular tools</h2>
            <p className="mt-1 text-muted">The essentials people reach for every day.</p>
          </div>
          <Link to="/tools" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary-soft sm:block">
            View all →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((t, i) => (
            <ToolCard key={t.id} tool={t} index={i} />
          ))}
        </div>
      </section>

      {/* ── Flagship workflow (JPG→PDF) ──────────────────────── */}
      {Prize && flagship && (
        <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6">
          <div className="overflow-hidden rounded-[2rem] border border-line bg-surface shadow-card">
            <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <Badge tone="primary">{CATEGORY_META[flagship.category].label}</Badge>
                <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">{flagship.name}</h2>
                <p className="mt-3 max-w-md text-muted">{flagship.description}</p>
                <div className="mt-6 space-y-3">
                  {flagship.settings?.map((s) => (
                    <div key={s.key} className="flex items-center justify-between rounded-xl border border-line bg-surface-2/50 px-4 py-3 text-sm">
                      <span className="text-muted">{s.label}</span>
                      <span className="font-medium">{s.options ? s.options.map((o) => o.label).join(' · ') : `${s.default}`}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:self-center">
                <Prize tool={flagship} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight">How it works</h2>
          <p className="mt-2 text-muted">Three steps. No account. Under a minute.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="relative rounded-2xl border border-line bg-surface p-6"
            >
              <span className="font-display text-5xl font-bold text-primary/15">{s.n}</span>
              <h3 className="mt-3 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Trust ────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((t, i) => (
            <motion.div
              key={t.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="rounded-2xl border border-line bg-surface p-6"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <t.icon className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold">{t.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{t.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-5xl px-5 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-secondary px-8 py-16 text-center text-white shadow-card">
          <div className="pointer-events-none absolute inset-0 dot-grid opacity-20" />
          <h2 className="relative font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to forge something better?
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-white/85">
            Jump in — pick any tool and start in seconds. No account, no catch, no sign-up.
          </p>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/tools">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                Start for free
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/10">
                See pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}