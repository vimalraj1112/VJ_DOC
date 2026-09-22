import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { env } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Thin wrapper around a headless LibreOffice for Office → PDF / PDF → Office
 * conversions. LibreOffice is the only practical free engine that preserves
 * real WYSIWYG layout across DOCX/XLSX/PPTX, and it runs locally so documents
 * never leave the machine's network.
 *
 * LibreOffice cannot run two instances against the same user profile, so all
 * conversions are serialized through a promise chain (multi-node deploys would
 * swap this for a distributed lock on the queue worker).
 */

export interface LibreOfficeOutcome {
  buffer: Buffer;
  size: number;
}

/**
 * JSON filter params that tell LibreOffice's PDF export to encrypt the result,
 * per the typed `{"type":...,"value":...}` wrapper syntax (LibreOffice 7.4+ /
 * 26.x). The password is JSON-stringified so quotes and backslashes survive.
 */
export function pdfEncryptionFilterParams(password: string): string {
  return JSON.stringify({
    EncryptFile: { type: 'boolean', value: 'true' },
    DocumentOpenPassword: { type: 'string', value: password },
  });
}

const CANDIDATE_BINARIES = (): string[] => {
  const list = [
    env.libreofficePath,
    process.platform === 'win32'
      ? 'C:\\Program Files\\LibreOffice\\program\\soffice.com'
      : '/usr/bin/soffice',
    '/usr/local/bin/soffice',
    '/opt/libreoffice/program/soffice',
  ].filter(Boolean);

  if (process.platform === 'win32') {
    list.push('C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com');
    list.push('C:\\Program Files\\LibreOffice\\program\\soffice.exe');
  }
  return list as string[];
};

let cachedBinary: string | null | undefined;

/** Resolve the soffice executable, caching the result. */
export async function findLibreOffice(): Promise<string | null> {
  if (cachedBinary !== undefined) return cachedBinary;

  // PATH lookup first (covers developers who run it as `soffice`).
  const onPath = await findOnPath('soffice');
  if (onPath) {
    cachedBinary = onPath;
    return onPath;
  }

  for (const candidate of CANDIDATE_BINARIES()) {
    try {
      await fs.access(candidate);
      cachedBinary = candidate;
      return candidate;
    } catch {
      // keep scanning
    }
  }

  cachedBinary = null;
  return null;
}

function findOnPath(name: string): Promise<string | null> {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const proc = spawn(cmd, [name], { windowsHide: true });
    let out = '';
    proc.stdout.on('data', (d: Buffer) => (out += d.toString()));
    proc.on('error', () => resolve(null));
    proc.on('close', (code) => {
      if (code !== 0) return resolve(null);
      const first = out.split(/\r?\n/).find(Boolean);
      resolve(first ?? null);
    });
  });
}

let serialized: Promise<unknown> = Promise.resolve();

/** Runs `fn` once the previously-queued conversion finishes. */
function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const next = serialized.then(fn, fn);
  // Keep the chain alive regardless of individual failures.
  serialized = next.catch(() => undefined);
  return next;
}

export interface ConvertArgs {
  /** Raw input bytes. */
  buffer: Buffer;
  /** Original filename — its extension decides LibreOffice's import filter. */
  originalName: string;
  /** Target extension WITHOUT the leading dot, e.g. `pdf`, `pptx`. */
  outputExt: string;
  /** Optional explicit filter token, e.g. `impress_pdf_Export`. */
  filter?: string;
  /**
   * Optional LibreOffice 7.4+ JSON filter options (typed wrapper objects), e.g.
   * `{"EncryptFile":{"type":"boolean","value":"true"},"DocumentOpenPassword":{"type":"string","value":"pw"}}`.
   */
  filterParams?: string;
}

/**
 * Convert one file with LibreOffice, returning the produced bytes.
 * Throws a clear ApiError when LibreOffice is missing or the export fails.
 */
export function convertWithLibreOffice(args: ConvertArgs): Promise<LibreOfficeOutcome> {
  return runExclusive(async () => {
    const soffice = await findLibreOffice();
    if (!soffice) {
      logger.warn('Office conversion requested but LibreOffice is not installed.');
      throw new Error('LIBREOFFICE_MISSING');
    }

    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vj-office-'));
    const profileDir = path.join(os.tmpdir(), `vj-louser-${randomUUID()}`);
    const inputPath = path.join(workDir, safeBase(args.originalName));
    const outDir = path.join(workDir, 'out');

    try {
      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(inputPath, args.buffer);

      const { exitCode, stderr } = await spawnAndWait(soffice, [
        '--headless',
        '--norestore',
        '--nolockcheck',
        '--nodefault',
        '--nologo',
        `-env:UserInstallation=file:///${profileDir.replace(/\\/g, '/')}`,
        '--convert-to',
        args.filterParams
          ? `${args.outputExt}:${args.filter ?? args.outputExt}:${args.filterParams}`
          : args.filter
            ? `${args.outputExt}:${args.filter}`
            : args.outputExt,
        '--outdir',
        outDir,
        inputPath,
      ]);

      const expected = path.join(outDir, `${path.basename(inputPath, path.extname(inputPath))}.${args.outputExt}`);
      let buffer: Buffer | null = null;
      try {
        buffer = await fs.readFile(expected);
      } catch {
        buffer = null;
      }

      if (exitCode !== 0 || !buffer) {
        logger.error(`LibreOffice conversion failed: ${stderr}`);
        throw new Error('CONVERT_FAILED');
      }

      return { buffer, size: buffer.byteLength };
    } finally {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
      await fs.rm(profileDir, { recursive: true, force: true }).catch(() => undefined);
    }
  });
}

function spawnAndWait(
  binary: string,
  args: string[],
): Promise<{ exitCode: number | null; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true });
    let stderr = '';
    child.stderr?.on('data', (d: Buffer) => (stderr += d.toString()));

    const killer = setTimeout(() => child.kill(), 180_000);
    child.on('error', (error) => {
      clearTimeout(killer);
      reject(error);
    });
    child.on('close', (exitCode) => {
      clearTimeout(killer);
      resolve({ exitCode, stderr });
    });
  });
}

function safeBase(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  return cleaned || 'document';
}