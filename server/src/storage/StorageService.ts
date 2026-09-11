/**
 * Storage abstraction.
 *
 * Nothing in the application talks to the filesystem directly — everything goes
 * through this interface, so swapping local disk for S3 (or any object store)
 * is a one-line change in `storage/index.ts`.
 */

export interface StoredObject {
  key: string;
  size: number;
}

export interface SaveOptions {
  contentType?: string;
  /** Arbitrary metadata persisted alongside the object where the driver supports it. */
  metadata?: Record<string, string>;
}

export interface StorageService {
  readonly driver: 'local' | 's3';

  /** Persist a buffer and return its key + byte size. */
  save(key: string, data: Buffer, options?: SaveOptions): Promise<StoredObject>;

  /** Persist from disk without loading the whole file into memory. */
  saveFromPath(key: string, absolutePath: string, options?: SaveOptions): Promise<StoredObject>;

  /** Read an object fully into memory. Throws ApiError.notFound when missing. */
  read(key: string): Promise<Buffer>;

  /** Absolute path for drivers that have one (local). Helps zero-copy processing. */
  resolvePath(key: string): Promise<string | null>;

  exists(key: string): Promise<boolean>;

  delete(key: string): Promise<void>;

  /** A URL the browser can fetch. Local driver returns a token-guarded API route. */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;

  list(prefix: string): Promise<StoredObject[]>;

  /** Ensure the backing store is ready to accept writes. */
  init(): Promise<void>;
}
