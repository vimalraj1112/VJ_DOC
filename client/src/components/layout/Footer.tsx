import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: 'Tools',
    links: [
      { label: 'PNG to PDF', to: '/tools/png-to-pdf' },
      { label: 'JPG to PDF', to: '/tools/jpg-to-pdf' },
      { label: 'PDF to JPG', to: '/tools/pdf-to-jpg' },
      { label: 'Merge PDF', to: '/tools/merge-pdf' },
      { label: 'Split PDF', to: '/tools/split-pdf' },
      { label: 'All tools', to: '/tools' },
    ],
  },
  {
    title: 'Product',
    links: [
      { label: 'Pricing', to: '/pricing' },
      { label: 'Why VJ_DOC', to: '/' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Privacy', to: '/pricing' },
      { label: 'Terms', to: '/pricing' },
      { label: 'Contact', to: '/pricing' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              Forge every document into something better. Powerful PDF tools in one beautiful workspace.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-faint">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm text-muted transition-colors hover:text-ink">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 sm:flex-row">
          <p className="text-sm text-faint">© 2026 VJ_DOC</p>
          <p className="text-sm text-faint">Built for people who work with documents.</p>
        </div>
      </div>
    </footer>
  );
}