import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn('grid place-items-center rounded-[10px] bg-gradient-to-br from-primary to-secondary text-white shadow-sm', className)}>
      <svg viewBox="0 0 24 24" fill="none" className="h-[60%] w-[60%]" aria-hidden>
        <path
          d="M7 4h7l3 3v13H7V4z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M14 4v3h3" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" fill="none" />
        <path d="M9.5 10h5M9.5 13h5M9.5 16h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Logo({ to = '/', className }: { to?: string; className?: string }) {
  return (
    <Link to={to} className={cn('flex items-center gap-2.5', className)} aria-label="VJ_DOC home">
      <LogoMark className="h-9 w-9" />
      <span className="font-display text-lg font-bold tracking-tight">VJ_DOC</span>
    </Link>
  );
}