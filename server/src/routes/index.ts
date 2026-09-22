import { Router } from 'express';
import toolsRouter from './tools.routes.js';
import filesRouter from './files.routes.js';
import jobsRouter from './jobs.routes.js';
import metaRouter from './meta.routes.js';
import authRouter from './auth.routes.js';
import signatureRouter from './signature.routes.js';

const api = Router();

api.use('/tools', toolsRouter);
api.use('/files', filesRouter);
api.use('/jobs', jobsRouter);
api.use('/auth', authRouter);
api.use('/signatures', signatureRouter);
api.use('/', metaRouter);

export default api;
