import { Server, type Socket } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { env } from '../config/env.js';
import { SOCKET_EVENTS, SOCKET_ROOM, type JobStatus } from '../config/constants.js';
import { logger } from '../utils/logger.js';

let io: Server | null = null;

/**
 * Creates the real-time layer. Clients join a room named after their job and
 * receive `job:progress` / `job:completed` / `job:failed` as the processor runs.
 */
export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
    transports: ['websocket', 'polling'],
    serveClient: false,
  });

  io.on('connection', (socket: Socket) => {
    socket.on('job:join', (jobId: unknown) => {
      if (typeof jobId === 'string' && jobId.length <= 64) {
        void socket.join(SOCKET_ROOM.job(jobId));
      }
    });
    socket.on('job:leave', (jobId: unknown) => {
      if (typeof jobId === 'string') void socket.leave(SOCKET_ROOM.job(jobId));
    });
  });

  logger.success('Socket.IO ready');
  return io;
}

export function getIo(): Server {
  if (!io) throw new Error('Socket.IO not initialised.');
  return io;
}

export interface JobProgressPayload {
  jobId: string;
  progress: number;
  stage: string;
  status: PackedStatus;
}

type PackedStatus = Extract<JobStatus, 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'>;

export function emitJobProgress(jobId: string, progress: number, stage: string): void {
  io?.to(SOCKET_ROOM.job(jobId)).emit(SOCKET_EVENTS.JOB_PROGRESS, {
    jobId,
    progress,
    stage,
    status: 'PROCESSING',
  } satisfies JobProgressPayload);
}

export function emitJobCompleted(jobId: string, payload: { outputFiles: string[]; progress: number }): void {
  io?.to(SOCKET_ROOM.job(jobId)).emit(SOCKET_EVENTS.JOB_COMPLETED, {
    ...payload,
    jobId,
    stage: 'Ready',
    status: 'COMPLETED',
  } satisfies JobProgressPayload & { outputFiles: string[] });
}

export function emitJobFailed(jobId: string, error: string): void {
  io?.to(SOCKET_ROOM.job(jobId)).emit(SOCKET_EVENTS.JOB_FAILED, {
    jobId,
    progress: 0,
    stage: 'Failed',
    status: 'FAILED' as const,
    error,
  });
}

export function emitJobCancelled(jobId: string): void {
  io?.to(SOCKET_ROOM.job(jobId)).emit(SOCKET_EVENTS.JOB_FAILED, {
    jobId,
    progress: 0,
    stage: 'Cancelled',
    status: 'CANCELLED' as const,
    error: 'Processing was cancelled.',
  });
}