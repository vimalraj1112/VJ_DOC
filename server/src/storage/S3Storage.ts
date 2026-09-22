import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createReadStream } from 'node:fs';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import type { SaveOptions, StorageService, StoredObject } from './StorageService.js';

/**
 * S3-compatible object storage driver. Works with AWS S3 and MinIO/local
 * S3 emulators (set S3_ENDPOINT + S3_FORCE_PATH_STYLE=true).
 *
 * Enabled by STORAGE_DRIVER=s3. The driver refuses to boot without
 * credentials + bucket so misconfiguration surfaces early in logs.
 */
export class S3Storage implements StorageService {
  readonly driver = 's3' as const;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const { accessKey, secretKey, endpoint, region, forcePathStyle, bucket } = env.s3;
    if (!bucket) {
      throw new Error('STORAGE_DRIVER=s3 requires S3_BUCKET to be set.');
    }
    if (!accessKey || !secretKey) {
      throw new Error('STORAGE_DRIVER=s3 requires S3_ACCESS_KEY and S3_SECRET_KEY.');
    }

    this.bucket = bucket;
    this.client = new S3Client({
      region,
      ...(endpoint ? { endpoint } : {}),
      ...(endpoint && forcePathStyle ? { forcePathStyle: true } : {}),
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });
  }

  async init(): Promise<void> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: 'init' }));
    } catch (error) {
      // HeadObject 404 is fine — it just means no `init` object yet. Auth /
      // bucket-not-found failures surface as 403/404 too, which is the failure mode we want to see.
      const code = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (code === 403) {
        throw new Error(`S3 credentials could not access bucket "${this.bucket}". Check S3_ACCESS_KEY / S3_SECRET_KEY / S3_ENDPOINT.`);
      }
    }
  }

  async save(key: string, data: Buffer, options?: SaveOptions): Promise<StoredObject> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: options?.contentType,
        Metadata: options?.metadata,
      }),
    );
    return { key, size: data.byteLength };
  }

  async saveFromPath(key: string, absolutePath: string, options?: SaveOptions): Promise<StoredObject> {
    const stream = createReadStream(absolutePath);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: stream,
        ContentType: options?.contentType,
        Metadata: options?.metadata,
      }),
    );
    const { ContentLength } = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return { key, size: ContentLength ?? 0 };
  }

  async read(key: string): Promise<Buffer> {
    try {
      const output = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!output.Body) throw ApiError.notFound('That file is no longer available. It may have expired.');
      return await streamToBuffer(output.Body as AsyncIterable<Uint8Array>);
    } catch (error) {
      const code = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (code === 404) throw ApiError.notFound('That file is no longer available. It may have expired.');
      throw error;
    }
  }

  async resolvePath(_key: string): Promise<string | null> {
    // S3 objects are not on the local disk; the processor reads via `read`.
    return null;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async list(prefix: string): Promise<StoredObject[]> {
    const out: StoredObject[] = [];
    let token: string | undefined;

    do {
      const page = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }),
      );
      for (const obj of page.Contents ?? []) {
        if (obj.Key && typeof obj.Size === 'number') out.push({ key: obj.Key, size: obj.Size });
      }
      token = page.NextContinuationToken;
    } while (token);

    return out;
  }
}

async function streamToBuffer(stream: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}