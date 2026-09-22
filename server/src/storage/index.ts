import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { LocalStorage } from './LocalStorage.js';
import { S3Storage } from './S3Storage.js';
import type { StorageService } from './StorageService.js';

let instance: StorageService | null = null;

/**
 * Returns the process-wide storage driver.
 * Swap `local` for `s3` via STORAGE_DRIVER — no other code needs to change.
 */
export function getStorage(): StorageService {
  if (instance) return instance;

  switch (env.storageDriver) {
    case 'local':
      instance = new LocalStorage(env.storageLocalDir);
      break;
    case 's3':
      instance = new S3Storage();
      break;
    default:
      throw new Error(`Unknown STORAGE_DRIVER: ${String(env.storageDriver)}`);
  }

  return instance;
}

export async function initStorage(): Promise<void> {
  const storage = getStorage();
  await storage.init();
  logger.success(`Storage ready (${storage.driver})`);
}

export type { StorageService, StoredObject, SaveOptions } from './StorageService.js';
