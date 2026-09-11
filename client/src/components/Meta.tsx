import { useEffect } from 'react';

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

export function Meta({ title, description }: { title: string; description?: string }) {
  useEffect(() => {
    document.title = title;
    if (description) setMeta('description', description);
    setMeta('og:title', title);
    if (description) setMeta('og:description', description);
  }, [title, description]);
  return null;
}