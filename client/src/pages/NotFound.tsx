import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileQuestion } from 'lucide-react';
import { Meta } from '@/components/Meta';
import { Button } from '@/components/ui/Button';

export function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-5 pt-24 text-center">
      <Meta title="Page not found | VJ_DOC" description="The page you are looking for does not exist." />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center"
      >
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary">
          <FileQuestion className="h-8 w-8" strokeWidth={1.7} />
        </div>
        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight">404</h1>
        <p className="mt-3 max-w-md text-muted">
          This page went missing — perhaps it was split, merged and reorganised somewhere else.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/">
            <Button size="lg">Back to home</Button>
          </Link>
          <Link to="/tools">
            <Button size="lg" variant="secondary">
              Browse tools
            </Button>
          </Link>
        </div>
      </motion.div>
    </main>
  );
}