import path from 'node:path';
import fs from 'node:fs';
import express, { type Express } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from './config/env.js';
import api from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(
    mongoSanitize({
      replaceWith: '_',
    }),
  );

  app.use('/api/v1', api);

  // In production, serve the built SPA so the server is deployable as-is.
  if (env.isProd) {
    const clientDist = path.resolve(env.storageLocalDir, '../../client/dist');
    if (fs.existsSync(clientDist)) {
      app.use(express.static(clientDist));
      app.get(/^\/(?!api).*/, (_req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'));
      });
    }
  }

  app.use('/api/v1', (_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found.', code: 'NOT_FOUND' });
  });
  app.use(errorHandler);

  return app;
}