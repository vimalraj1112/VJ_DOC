import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the server package root regardless of the cwd we were started from.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function str(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function num(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number, received "${raw}"`);
  }
  return parsed;
}

const NODE_ENV = str('NODE_ENV', 'development');
const isProd = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

export const env = {
  nodeEnv: NODE_ENV,
  isProd,
  isDev: NODE_ENV === 'development',
  isTest,
  port: num('PORT', 5000),
  mongoUri: str('MONGODB_URI', 'mongodb://127.0.0.1:27017/vj_doc'),
  clientUrl: str('CLIENT_URL', 'http://localhost:5173'),
  jwtSecret: str('JWT_SECRET', 'dev-only-jwt-secret-do-not-use-in-production'),
  jwtRefreshSecret: str('JWT_REFRESH_SECRET', 'dev-only-refresh-secret-do-not-use-in-production'),
  storageDriver: str('STORAGE_DRIVER', 'local') as 'local' | 's3',
  storageLocalDir: path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../',
    str('STORAGE_LOCAL_DIR', 'storage'),
  ),
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? '',
    bucket: process.env.S3_BUCKET ?? '',
    region: process.env.S3_REGION ?? 'us-east-1',
    accessKey: process.env.S3_ACCESS_KEY ?? '',
    secretKey: process.env.S3_SECRET_KEY ?? '',
    forcePathStyle: str('S3_FORCE_PATH_STYLE', 'true') === 'true',
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? '',
  },
  maxFileSizeMb: num('MAX_FILE_SIZE_MB', 100),
  maxFilesPerRequest: num('MAX_FILES_PER_REQUEST', 30),
  fileTtlHours: num('FILE_TTL_HOURS', 24),
  /** How many jobs may run at once in the in-process queue. */
  queueConcurrency: num('QUEUE_CONCURRENCY', 2),
  /** Absolute path to `soffice`; auto-detected when empty. */
  libreofficePath: process.env.LIBREOFFICE_PATH ?? '',
  ai: {
    provider: process.env.AI_PROVIDER ?? '',
    apiKey: process.env.AI_API_KEY ?? '',
    model: process.env.AI_MODEL ?? '',
    baseUrl: process.env.AI_BASE_URL ?? '',
  },
} as const;

export const maxFileSizeBytes = env.maxFileSizeMb * 1024 * 1024;

// Fail loudly rather than silently shipping insecure defaults to production.
if (env.isProd) {
  if (env.jwtSecret.includes('dev-only') || env.jwtSecret.includes('change-me')) {
    throw new Error('JWT_SECRET must be set to a strong value in production.');
  }
  if (env.jwtRefreshSecret.includes('dev-only') || env.jwtRefreshSecret.includes('change-me')) {
    throw new Error('JWT_REFRESH_SECRET must be set to a strong value in production.');
  }
}
