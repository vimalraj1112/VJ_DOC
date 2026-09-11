import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const DEFAULT_LOCAL_URI = 'mongodb://127.0.0.1:27017/vj_doc';

let memoryServer: MongoMemoryServer | null = null;

/**
 * Connects to MongoDB.
 *
 * Production/test: a real URI is required and a failure is fatal.
 * Development: if the default local URI is unreachable we fall back to an
 * ephemeral in-process `mongod` so the app runs with zero external setup and
 * everything still behaves like a real database (data is lost on restart).
 */
export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => logger.success('MongoDB connected'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err.message));

  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000, maxPoolSize: 20 });
  } catch (error) {
    if (env.isProd || env.mongoUri !== DEFAULT_LOCAL_URI) throw error;

    logger.warn('No reachable MongoDB at the default local URI — starting an in-memory instance for local dev.');
    memoryServer = await MongoMemoryServer.create({ instance: { dbName: 'vj_doc', port: 0, ip: '127.0.0.1' } });
    const uri = memoryServer.getUri('vj_doc');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 20 });
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close(false);
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}