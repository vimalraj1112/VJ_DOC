import { createServer } from 'node:http';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { initStorage } from './storage/index.js';
import { createApp } from './app.js';
import { initSocket } from './services/socket.js';
import { startCleanupScheduler, stopCleanupScheduler } from './jobs/cleanup.js';
import { logger } from './utils/logger.js';

async function bootstrap(): Promise<void> {
  const app = createApp();
  const httpServer = createServer(app);

  await connectDatabase();
  await initStorage();
  initSocket(httpServer);
  startCleanupScheduler();

  httpServer.listen(env.port, () => {
    logger.success(`VJ_DOC server listening on http://localhost:${env.port}`);
    logger.info(`Client origin: ${env.clientUrl}`);
    logger.info(`Storage driver: ${env.storageDriver}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.warn(`${signal} received, shutting down gracefully…`);
    stopCleanupScheduler();
    httpServer.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});