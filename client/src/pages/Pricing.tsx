import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { Meta } from '@/components/Meta';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    name: 'Free',
    monthly: '$0',
    blurb: 'Everything you need for everyday document work.',
    features: [
      'All core tools — convert, merge, split',
      'Up to 30 files at once in the browser',
      'Images to PDF, PDF to images',
      'Private 24-hour file storage',
      'No sign-up, ever',
    ],
    cta: 'Start free',
    to: '/tools',
    highlight: false,
  },
  {
    name: 'Pro',
    monthly: '$9',
    blurb: 'For heavy document users who want more power.',
    features: [
      'Everything in Free',
      'Compress & repair PDFs',
      'Protect, unlock & watermark',
      'Sign & request signatures',
      'Batch processing',
      'Priority processing queue',
      'Longer 7-day file storage',
    ],
    cta: 'Go Pro',
    to: '/tools',
    highlight: true,
  },
  {
    name: 'Team',
    monthly: '$19',
    blurb: 'Collaborative document workflows for small teams.',
    features: [
      'Everything in Pro',
      'Shared team folder',
      'Approval workflows',
      'Usage analytics',
      'SSO & role management',
    ],
    cta: 'Contact us',
    to: '/tools',
    highlight: false,
  },
];

export function Pricing() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-24 sm:px-6 sm:pt-28">
      <Meta
        title="Pricing | VJ_DOC"
        description="Start free. Upgrade to Pro when you need more power. Simple, transparent pricing for your PDF workflow."
      />

      <header className="mx-auto max-w-2xl text-center">
        <Badge tone="primary" className="mb-4 px-3 py-1">
          <Sparkles className="h-3.5 w-3.5" /> Simple, honest pricing
        </Badge>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="font-display text-4xl font-bold tracking-tight sm:text-5xl"
        >
          Start free. Upgrade when you need it.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mt-4 text-lg text-muted"
        >
          Every tool works without an account. There are no hidden fees and you can leave anytime.
        </motion.p>
      </header>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className={cn(
              'relative flex flex-col rounded-3xl border bg-surface p-7',
              plan.highlight
                ? 'border-transparent shadow-pop ring-2 ring-primary'
                : 'border-line shadow-[var(--shadow-sm)]',
            )}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-fg">
                Most popular
              </span>
            )}
            <h3 className="font-display text-xl font-bold">{plan.name}</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold">{plan.monthly}</span>
              <span className="text-sm text-muted">/month</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{plan.blurb}</p>

            <ul className="mt-6 space-y-3 border-t border-line pt-6 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex-1" />
            <Link to={plan.to} className="block">
              <Button size="lg" variant={plan.highlight ? 'primary' : 'secondary'} className="w-full">
                {plan.cta}
              </Button>
            </Link>
          </motion.div>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-faint">
        All prices in USD. Cancel anytime. Files are private and auto-delete after storage expires.
      </p>
    </main>
  );
}