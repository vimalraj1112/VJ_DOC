import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  CloudLightning,
  FileImage,
  FileSpreadsheet,
  FileType2,
  LockKeyhole,
  MonitorSmartphone,
  Presentation,
  ShieldCheck,
  Sparkles,
  Timer,
  Lock,
} from 'lucide-react';
import { Meta } from '@/components/Meta';
import { Badge } from '@/components/ui/Badge';
import { ToolCard } from '@/components/ui/ToolCard';
import { Button } from '@/components/ui/Button';
import { FileUploader } from '@/components/tools/FileUploader';
import { ProcessPanel } from '@/components/tools/ProcessPanel';
import { ToolResult } from '@/components/tools/ToolResult';
import { useProcessJob } from '@/lib/useProcessJob';
import { workingTools } from '@/lib/tools';
import type { Accept } from 'react-dropzone';

const EASE = [0.22, 1, 0.36, 1] as const;
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/* Self-contained hero converter: drop an image → real PDF conversion runs */
function HeroConverter() {
  const [file, setFile] = useState<File | null>(null);
  const job = useProcessJob();
  const accept = useMemo<Accept>(() => ({ 'image/png': [], 'image/jpeg': [], 'image/webp': [] }), []);

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
        <Button variant="secondary" size="lg" className="mt-6" onClick={() => job.reset()}>
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

const FLOATERS = [
  { icon: FileType2, className: '-left-8 -top-6', delay: 0, from: '#60a5fa', label: 'DOCX' },
  { icon: FileImage, className: '-right-9 top-8', delay: 0.6, from: '#f59e0b', label: 'JPG' },
  { icon: FileSpreadsheet, className: '-left-6 bottom-10', delay: 1.2, from: '#4ade80', label: 'XLSX' },
  { icon: Presentation, className: '-right-7 -bottom-7', delay: 0.9, from: '#fb7185', label: 'PPTX' },
  { icon: LockKeyhole, className: 'left-10 -top-10', delay: 1.6, from: '#a78bfa', label: 'Encrypted' },
];

const MARQUEE = ['PDF', 'DOCX', 'XLSX', 'PPTX', 'JPG', 'PNG', 'WEBP', 'Markdown', 'Sign', 'Merge', 'Split', 'Redact', 'Protect', 'Compress'];

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

  return (
    <main className="w-full overflow-hidden">
      <Meta
        title="VJ_DOC — Forge every document into something better"
        description="Free, private, all-in-one PDF tools. Convert, merge, split, compress and protect your documents in the browser — no sign-up ever."
      />

      {/* ── Hero splash ─────────────────────────────────────── */}
      <section className="relative px-5 pb-16 pt-28 sm:px-6 sm:pt-32">
        {/* Ambient animated gradient blobs */}
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            animate={{ scale: [1, 1.15, 1], x: [0, 40, 0], y: [0, -30, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-primary-soft blur-3xl"
          />
          <motion.div
            animate={{ scale: [1.1, 1, 1.1], x: [0, -50, 0], y: [0, 30, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -left-40 top-40 h-96 w-96 rounded-full opacity-60 blur-3xl"
            style={{ background: 'radial-gradient(closest-side, rgba(34,211,238,0.22), transparent)' }}
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -right-32 top-64 h-[420px] w-[420px] rounded-full opacity-60 blur-3xl"
            style={{ background: 'radial-gradient(closest-side, rgba(124,58,237,0.25), transparent)' }}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-40" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <motion.div variants={container} initial="hidden" animate="show">
            <motion.div variants={item}>
              <Badge tone="primary" className="mb-5 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5" /> The all-in-one document forge
              </Badge>
            </motion.div>

            <motion.h1 variants={item} className="font-display text-[2.75rem] font-bold leading-[1.03] tracking-tight sm:text-6xl lg:text-[4.25rem]">
              Forge every document into{' '}
              <span className="text-gradient-animated">something better.</span>
            </motion.h1>

            <motion.p variants={item} className="mt-6 max-w-lg text-lg text-muted sm:text-xl">
              Convert, merge, split, encrypt and summarize PDFs in seconds — including full Word, Excel and PowerPoint round-trips. Free, private and right in your browser.
            </motion.p>

            <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/tools">
                <Button size="lg" className="group">
                  Start forging
                  <Sparkles className="ml-2 h-4 w-4 transition-transform group-hover:rotate-12" />
                </Button>
              </Link>
              <Link to="/tools/png-to-pdf">
                <Button size="lg" variant="secondary">
                  Convert an image →
                </Button>
              </Link>
            </motion.div>

            <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-faint">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> 100% private</span>
              <span className="inline-flex items-center gap-1.5"><Timer className="h-4 w-4 text-primary" /> No sign-up</span>
              <span className="inline-flex items-center gap-1.5"><CloudLightning className="h-4 w-4 text-primary" /> 1-click convert</span>
            </motion.div>
          </motion.div>

          {/* Converter card with floating format chips */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
            className="relative"
          >
            <div className="absolute -inset-8 -z-10 animate-pulse rounded-[2.5rem] bg-gradient-to-br from-primary/15 to-secondary/15 blur-3xl" />
            <div className="rounded-[2rem] border border-line/70 bg-surface/80 p-2 shadow-card backdrop-blur-xl">
              <HeroConverter />
            </div>

            {FLOATERS.map((f) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
                transition={{
                  opacity: { duration: 0.5, delay: 0.5 + f.delay },
                  scale: { duration: 0.5, delay: 0.5 + f.delay },
                  y: { duration: 4 + f.delay, repeat: Infinity, ease: 'easeInOut' },
                }}
                className={`absolute ${f.className} hidden border border-line/70 bg-surface/90 px-3 py-2 shadow-md backdrop-blur-md sm:flex`}
                style={{ borderRadius: '0.9rem' }}
              >
                <f.icon className="h-4 w-4" style={{ color: f.from }} strokeWidth={2} />
                <span className="ml-1.5 text-xs font-semibold text-muted">{f.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Format marquee ──────────────────────────────────── */}
      <section className="relative border-y border-line bg-surface/60 py-5" aria-hidden>
        <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <motion.div
            animate={{ x: [0, '-50%'] }}
            transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
            className="flex shrink-0 items-center gap-6 pr-6"
          >
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <span key={`${m}-${i}`} className="flex items-center gap-6 whitespace-nowrap font-display text-sm font-medium tracking-wide text-muted">
                {m}
                <Sparkles className="h-3.5 w-3.5 text-primary/40" />
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Popular tools ──────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-6">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, ease: EASE }}
              className="font-display text-3xl font-bold tracking-tight sm:text-4xl"
            >
              The essentials, at your fingertips
            </motion.h2>
            <p className="mt-2 text-muted">Six of the everyday heroes — plus 20+ more in the forge.</p>
          </div>
          <Link to="/tools" className="hidden shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary-soft sm:block">
            View all tools →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((t, i) => (
            <ToolCard key={t.id} tool={t} index={i} />
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight">How it works</h2>
          <p className="mt-2 text-muted">Three steps. No account. Under a minute.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: EASE }}
              className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-line-strong"
            >
              <span className="font-display text-5xl font-bold text-primary/15 transition-colors group-hover:text-primary/30">{s.n}</span>
              <h3 className="mt-3 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Trust ──────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((t, i) => (
            <motion.div
              key={t.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.07, ease: EASE }}
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

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-5xl px-5 py-20 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: EASE }}
          className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-secondary px-8 py-16 text-center text-white shadow-card"
        >
          <div className="pointer-events-none absolute inset-0 dot-grid opacity-20" />
          <motion.div
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
          />
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
        </motion.div>
      </section>
    </main>
  );
}