import { io, type Socket } from 'socket.io-client';

export interface JobProgressPayload {
  jobId: string;
  progress: number;
  stage: string;
  status: string;
  outputFiles?: string[];
  error?: string;
}

let socket: Socket | null = null;

/** Returns a lazily-created socket (only opened once live progress is needed). */
export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', { autoConnect: false, transports: ['websocket', 'polling'] });
  }
  return socket;
}

/** Join the socket room for a job and wire up the full lifecycle. */
export function subscribeToJob(
  jobId: string,
  handlers: {
    onProgress?: (progress: number, stage: string) => void;
    onCompleted?: (payload: JobProgressPayload) => void;
    onFailed?: (error?: string) => void;
  },
): () => void {
  const s = getSocket();
  if (!s.connected) s.connect();

  const onProgress = (payload: JobProgressPayload) => handlers.onProgress?.(payload.progress, payload.stage);
  const onCompleted = (payload: JobProgressPayload) => handlers.onCompleted?.(payload);
  const onFailed = (payload: JobProgressPayload) => handlers.onFailed?.(payload.error);

  s.on('job:progress', onProgress);
  s.on('job:completed', onCompleted);
  s.on('job:failed', onFailed);

  s.emit('job:join', jobId);

  return () => {
    s.off('job:progress', onProgress);
    s.off('job:completed', onCompleted);
    s.off('job:failed', onFailed);
    s.emit('job:leave', jobId);
  };
}