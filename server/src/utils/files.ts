import path from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Never trust a client-supplied filename. This is the single place where an
 * untrusted name becomes a safe display name, and where internal storage keys
 * are minted.
 */

// Built from escapes so no raw control bytes ever live in this source file.
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]', 'g');
const RESERVED = new RegExp('[\\\\/:*?"<>|]', 'g');

/** Produces a safe, human-readable display name (kept for the user, never for disk). */
export function sanitizeDisplayName(original: string, fallbackExt = ''): string {
  const base = path.basename(original ?? '');
  const stripped = base
    .replace(CONTROL_CHARS, '')
    .replace(RESERVED, '_')
    .replace(/\s+/g, ' ')
    .trim();

  const withoutDotfiles = stripped.replace(/^\.+/, '');
  const safe = withoutDotfiles.slice(0, 160);

  if (!safe) return `document${fallbackExt}`;
  return safe;
}

export function extensionOf(filename: string): string {
  const ext = path.extname(filename ?? '').toLowerCase();
  return ext.length > 12 ? '' : ext;
}

export function stripExtension(filename: string): string {
  return filename.slice(0, filename.length - path.extname(filename).length);
}

/** Collision-proof internal key. The user never sees this. */
export function createStorageKey(ext = ''): string {
  const now = new Date();
  const folder = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const safeExt = ext && ext.startsWith('.') ? ext : ext ? `.${ext}` : '';
  return `${folder}/${randomUUID()}${safeExt}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}
