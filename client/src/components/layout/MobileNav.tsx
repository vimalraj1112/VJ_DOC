import { AnimatePresence, motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/Button';
import { useUi } from '@/store/ui';

export function MobileNav() {
  const { mobileNavOpen, setMobileNavOpen } = useUi();

  const links = [
    { to: '/tools', label: 'All Tools' },
    { to: '/pricing', label: 'Pricing' },
    { to: '/tools/png-to-pdf', label: 'PNG to PDF' },
    { to: '/tools/jpg-to-pdf', label: 'JPG to PDF' },
    { to: '/tools/pdf-to-jpg', label: 'PDF to JPG' },
    { to: '/tools/merge-pdf', label: 'Merge PDF' },
  ];

  return (
    <AnimatePresence>
      {mobileNavOpen && (
        <motion.div
          className="fixed inset-0 z-[70] md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="absolute right-0 top-0 flex h-full w-[82%] max-w-sm flex-col border-l border-line bg-surface"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <Logo />
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-muted hover:bg-surface-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 px-4 py-2">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-xl px-4 py-3 text-base font-medium text-ink transition-colors hover:bg-surface-2"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="space-y-3 border-t border-line bg-surface-2/50 px-5 py-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Appearance</span>
                <ThemeToggle />
              </div>
              <Link to="/tools" onClick={() => setMobileNavOpen(false)}>
                <Button className="w-full" size="lg">
                  Get Started
                </Button>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}