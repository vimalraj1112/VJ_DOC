import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, Search } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/Button';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/tools', label: 'Tools' },
  { to: '/pricing', label: 'Pricing' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { setCommandOpen, setMobileNavOpen } = useUi();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isOnTool = location.pathname.startsWith('/tools/');

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 sm:px-6 pt-3">
      <div
        className={cn(
          'mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl border px-4 py-2.5 transition-all duration-300',
          scrolled || isOnTool
            ? 'border-line bg-surface/85 shadow-[var(--shadow-sm)] backdrop-blur-xl'
            : 'border-transparent bg-transparent',
        )}
      >
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/tools'}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink',
                  isActive && 'text-ink',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCommandOpen(true)}
            className="hidden items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-faint transition-colors hover:border-line-strong hover:text-muted sm:flex"
            aria-label="Search tools"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search tools</span>
            <kbd className="ml-4 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
          </button>

          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          <Link to="/tools" className="hidden sm:block">
            <Button size="sm">Get Started</Button>
          </Link>

          <button
            onClick={() => setMobileNavOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-lg text-ink transition-colors hover:bg-surface-2 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}