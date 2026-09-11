import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from '@/store/theme';

export function Toaster() {
  const theme = useTheme((s) => s.resolved);
  return (
    <SonnerToaster
      theme={theme}
      position="bottom-center"
      toastOptions={{
        style: {
          background: theme === 'dark' ? '#1b1b20' : '#ffffff',
          color: theme === 'dark' ? '#fafafa' : '#18181b',
          border: '1px solid ' + (theme === 'dark' ? '#27272a' : '#e4e4e7'),
          borderRadius: '0.9rem',
        },
      }}
    />
  );
}