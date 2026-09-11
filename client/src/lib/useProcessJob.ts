import { useCallback, useRef, useState } from 'react';
import { processTool, cancelJob, apiErrorMessage } from './api';
import { subscribeToJob } from './socket';
import type { ProcessResponse } from './types';

export type ProcessState = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';

export function useProcessJob() {
  const [state, setState] = useState<ProcessState>('idle');
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('Warming up');
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const jobIdRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  }, []);

  const run = useCallback(
    async (toolId: string, files: File[], options: Record<string, unknown>) => {
      cleanup();
      setState('uploading');
      setProgress(3);
      setStage('Uploading');
      setError(null);
      setResult(null);

      // The HTTP call both uploads and processes; we surface live progress over
      // the socket when we learn the job id.
      try {
        const response = await processTool(toolId, files, options);
        if (response.job.id) {
          jobIdRef.current = response.job.id;
          unsubscribeRef.current = subscribeToJob(response.job.id, {
            onCompleted: () => {
              setProgress(100);
              setStage('Ready');
            },
          });
        }
        setResult(response);
        setState('completed');
        setProgress(100);
        setStage('Ready');
      } catch (err) {
        cleanup();
        setError(apiErrorMessage(err));
        setState('failed');
      }
    },
    [cleanup],
  );

  const cancel = useCallback(async () => {
    if (jobIdRef.current) await cancelJob(jobIdRef.current).catch(() => undefined);
    cleanup();
    setState('cancelled');
  }, [cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setState('idle');
    setProgress(0);
    setStage('Warming up');
    setResult(null);
    setError(null);
    jobIdRef.current = null;
  }, [cleanup]);

  return { state, progress, stage, result, error, run, cancel, reset };
}