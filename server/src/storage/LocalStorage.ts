import fs from 'node:fs/promises';
import path from 'node:path';
import { ApiError } from '../utils/ApiError.js';
import type { SaveOptions, StorageService, StoredObject } from './StorageService.js';

/**
 * Development storage driver: writes under `server/storage`.
 * Keys are relative paths such as `2026-09/uuid.pdf`.
 */
export class LocalStorage implements StorageService {
  readonly driver = 'local' as const;
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  async init(): Promise<void> {
    await fs.mkdir(this.root, { recursive: true });
  }

  /** Resolves a key to an absolute path, refusing anything that escapes the root. */
  private absolute(key: string): string {
    const target = path.resolve(this.root, key);
    const rootWithSep = this.root.endsWith(path.sep) ? this.root : this.root + path.sep;
    if (target !== this.root && !target.startsWith(rootWithSep)) {
      throw ApiError.forbidden('Invalid storage key.');
    }
    return target;
  }

  private async ensureDirFor(absolutePath: string): Promise<void> {
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  }

  async save(key: string, data: Buffer, _options?: SaveOptions): Promise<StoredObject> {
    const target = this.absolute(key);
    await this.ensureDirFor(target);
    await fs.writeFile(target, data);
    return { key, size: data.byteLength };
  }

  async saveFromPath(key: string, absolutePath: string, _options?: SaveOptions): Promise<StoredObject> {
    const target = this.absolute(key);
    await this.ensureDirFor(target);
    await fs.copyFile(absolutePath, target);
    const stat = await fs.stat(target);
    return { key, size: stat.size };
  }

  async read(key: string): Promise<Buffer> {
    try {
      return await fs.readFile(this.absolute(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw ApiError.notFound('That file is no longer available. It may have expired.');
      }
      throw error;
    }
  }

  async resolvePath(key: string): Promise<string | null> {
    const target = this.absolute(key);
    try {
      await fs.access(target);
      return target;
    } catch {
      return null;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.absolute(key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.absolute(key));
    } catch (error) {
      // Deleting something that is already gone is a success, not a failure.
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  async getSignedUrl(key: string): Promise<string> {
    // Local files are always served through the token-guarded download route,
    // so the key itself is the only thing we need to hand back.
    return key;
  }

  async list(prefix: string): Promise<StoredObject[]> {
    const dir = this.absolute(prefix);
    const out: StoredObject[] = [];

    const walk = async (current: string): Promise<void> => {
      let entries;
      try {
        entries = await fs.readdir(current, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.isFile()) {
          const stat = await fs.stat(full);
          out.push({ key: path.relative(this.root, full).split(path.sep).join('/'), size: stat.size });
        }
      }
    };

    await walk(dir);
    return out;
  }
}
