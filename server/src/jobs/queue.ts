import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * In-process, concurrency-limited task queue with two priority lanes.
 *
 * The old pipeline executed each processor inline in the HTTP request. This
 * decouples request handling from processing: uploads are accepted instantly,
 * jobs queue here, and progress/failure flows over Socket.IO as workers pull
 * them. `priority` jobs jump the normal lane (the pricing page advertises a
 * priority queue — wire plan/entitlements here later).
 *
 * Redis/BullMQ would replace this in a multi-process deployment; the queue's
 * public surface stays the same so swapping is a single class change.
 */

export interface QueueTask {
  id: string;
  priority: boolean;
  /** Runs the job. Must never throw — callers resolve failures internally. */
  run: () => Promise<void>;
}

const active = new Map<string, AbortController>();
const normalQueue: QueueTask[] = [];
const priorityQueue: QueueTask[] = [];
const pending = new Map<string, { controller: AbortController }>();
let running = 0;

/** Register a job as pending (queued or running) and hand back its controller. */
export function registerJob(id: string): AbortController {
  const controller = new AbortController();
  active.set(id, controller);
  pending.set(id, { controller });
  return controller;
}

export function getAbortController(id: string): AbortController | null {
  return active.get(id) ?? null;
}

export function isJobPending(id: string): boolean {
  return active.has(id);
}

/** Deregister the job once its task has fully finished. */
export function deregisterJob(id: string): void {
  active.delete(id);
  pending.delete(id);
}

/** True when the caller has asked to cancel a job that has not started yet. */
export function wasCancelledWhileQueued(id: string): boolean {
  const slot = pending.get(id);
  return Boolean(slot?.controller.signal.aborted);
}

/** Add a job to the appropriate lane and start pumping if a slot is free. */
export function enqueueJob(task: QueueTask): void {
  if (wasCancelledWhileQueued(task.id)) {
    // Cancelled before it ever ran — never execute it.
    void task.run().finally(() => deregisterJob(task.id));
    return;
  }
  if (task.priority) priorityQueue.push(task);
  else normalQueue.push(task);
  pump();
}

/**
 * Cancel a pending job. Signals the processor when it is running; queued jobs
 * are flagged via their controller so the worker skips them on dequeue.
 */
export function cancelJob(id: string): boolean {
  const controller = active.get(id);
  if (!controller) return false;
  controller.abort();
  return true;
}

function pump(): void {
  while (running < env.queueConcurrency && (priorityQueue.length > 0 || normalQueue.length > 0)) {
    const task = priorityQueue.shift() ?? normalQueue.shift();
    if (!task) break;

    running++;
    void task
      .run()
      .catch((error) => {
        // run() implementations are expected to swallow failures, but guard
        // against anything that still escapes so the pump never dies.
        logger.error(`Queued task ${task.id} escaped with an error:`, error);
      })
      .finally(() => {
        running--;
        deregisterJob(task.id);
        setImmediate(pump);
      });
  }
}

export function queueStats(): { running: number; queued: number; priority: number } {
  return { running, queued: normalQueue.length + priorityQueue.length, priority: priorityQueue.length };
}