import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { LocalStorage } from './LocalStorage.js';
import type { StorageService } from './StorageService.js';

let instance: StorageService | null = null;

/**
 * Returns the process-wide storage driver.
 *
 * To move to S3-compatible object storage, add an `S3Storage` implementing
 * `StorageService` and return it here when `env.storageDriver === 's3'`.
 * No other file in the codebase needs to change.
 */
export function getStorage(): StorageService {
  if (instance) return instance;

  switch (env.storageDriver) {
    case 'local':
      instance = new LocalStorage(env.storageLocalDir);
      break;
    case 's3':
      throw new Error(
        'STORAGE_DRIVER=s3 was requested but no S3 driver is registered. Add an S3Storage implementation in src/storage/.',
      );
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
