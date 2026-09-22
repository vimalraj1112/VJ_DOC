import { useCallback, useEffect, useRef, useState } from 'react';
import { processTool, cancelJob, getJob, apiErrorMessage } from './api';
import { subscribeToJob } from './socket';
import type { JobDetail, ProcessResponse } from './types';

export type ProcessState = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';

const POLL_INTERVAL_MS = 2200;

/**
 * Runs a tool against the server's async job queue.
 *
 * `processTool` now answers 202 immediately with a QUEUED job id, so we track
 * real progress through Socket.IO (`job:progress` / `job:completed`) and keep a
 * lightweight GET /jobs/:id poll as a fallback for missed events or dropped
 * sockets. On completion we fetch the job detail to resolve the output files.
 */
export function useProcessJob() {
  const [state, setState] = useState<ProcessState>('idle');
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('Warming up');
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const finishedRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    stopPolling();
  }, [stopPolling]);

  useEffect(() => cleanup, [cleanup]);

  const finalize = useCallback(
    async (jobId: string, suddenDeath?: { failed?: boolean; cancelled?: boolean; message?: string }) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      cleanup();

      // Sudden death (FAILED/CANCELLED delivered without a final progress
      // event) — resolve the error from the job itself.
      if (suddenDeath?.failed || suddenDeath?.cancelled) {
        let detail: JobDetail | null = null;
        if (jobId) {
          try {
            detail = await getJob(jobId);
          } catch {
            detail = null;
          }
        }
        if (suddenDeath.cancelled || detail?.status === 'CANCELLED') {
          setState('cancelled');
          return;
        }
        setError(suddenDeath.message ?? detail?.error ?? 'The job failed before it finished.');
        setState('failed');
        return;
      }

      try {
        const detail = await getJob(jobId);
        if (detail.status === 'FAILED') {
          setError(detail.error ?? 'Processing failed.');
          setState('failed');
          return;
        }
        if (detail.status === 'CANCELLED') {
          setState('cancelled');
          return;
        }
        setResult({ job: detail, outputFiles: detail.files });
        setProgress(100);
        setStage('Ready');
        setState('completed');
      } catch (err) {
        setError(apiErrorMessage(err));
        setState('failed');
      }
    },
    [cleanup],
  );

  const run = useCallback(
    async (toolId: string, files: File[], options: Record<string, unknown>) => {
      cleanup();
      finishedRef.current = false;
      jobIdRef.current = null;
      setState('uploading');
      setProgress(3);
      setStage('Uploading');
      setError(null);
      setResult(null);

      try {
        const response = await processTool(toolId, files, options);
        const jobId = response.job.id;
        jobIdRef.current = jobId;

        unsubscribeRef.current = subscribeToJob(jobId, {
          onProgress: (p, s) => {
            if (finishedRef.current) return;
            setProgress(p);
            setStage(s);
          },
          onCompleted: () => void finalize(jobId),
          onFailed: (message) => void finalize(jobId, { failed: true, message }),
          onCancelled: () => void finalize(jobId, { cancelled: true }),
        });

        setState('processing');
        setProgress(Math.max(response.job.progress ?? 5, 5));
        setStage(response.job.stage || 'Queued');

        // Fallback poll — the socket may have joined after the job already ran.
        const first = await getJob(jobId).catch(() => null);
        applySnapshot(first, jobId, finalize, setProgress, setStage);

        const interval = setInterval(() => {
          if (finishedRef.current) {
            stopPolling();
            return;
          }
          void getJob(jobId)
            .then((detail) => {
              if (finishedRef.current) return;
              if (detail.status === 'COMPLETED') {
                void finalize(jobId);
              } else if (detail.status === 'FAILED') {
                void finalize(jobId, { failed: true, message: detail.error ?? undefined });
              } else if (detail.status === 'CANCELLED') {
                void finalize(jobId, { cancelled: true });
              } else {
                setProgress(detail.progress);
                setStage(detail.stage);
              }
            })
            .catch(() => undefined);
        }, POLL_INTERVAL_MS);
        pollRef.current = interval;
      } catch (err) {
        cleanup();
        setError(apiErrorMessage(err));
        setState('failed');
      }
    },
    [cleanup, finalize, stopPolling],
  );

  const cancel = useCallback(async () => {
    if (!jobIdRef.current || finishedRef.current) {
      cleanup();
      setState('cancelled');
      return;
    }
    await cancelJob(jobIdRef.current).catch(() => undefined);
    finishedRef.current = true;
    cleanup();
    setState('cancelled');
  }, [cleanup]);

  const reset = useCallback(() => {
    cleanup();
    finishedRef.current = false;
    setState('idle');
    setProgress(0);
    setStage('Warming up');
    setResult(null);
    setError(null);
    jobIdRef.current = null;
  }, [cleanup]);

  return { state, progress, stage, result, error, run, cancel, reset };
}

/** Applies one job snapshot (used right after subscribing). */
function applySnapshot(
  detail: JobDetail | null,
  _jobId: string,
  finalize: (jobId: string, suddenDeath?: { failed?: boolean; cancelled?: boolean; message?: string }) => Promise<void>,
  setProgress: (v: number) => void,
  setStage: (s: string) => void,
): void {
  if (!detail) return;
  if (detail.status === 'COMPLETED') void finalize(detail.id);
  else if (detail.status === 'FAILED') void finalize(detail.id, { failed: true, message: detail.error ?? undefined });
  else if (detail.status === 'CANCELLED') void finalize(detail.id, { cancelled: true });
  else {
    setProgress(detail.progress);
    setStage(detail.stage);
  }
}