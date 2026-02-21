/**
 * Background Job Queue (Redis-backed)
 *
 * Provides a simple, reliable job queue using Redis lists.
 * Supports:
 * - Named job types with registered handlers
 * - Automatic retries with configurable max attempts
 * - Job status tracking (pending, processing, completed, failed)
 * - Queue statistics
 *
 * Jobs are stored as JSON in Redis lists and processed via polling.
 */

import crypto from 'crypto';
import { getRedisClient } from '../database/redis-client';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('job-queue');

const QUEUE_PREFIX = 'jobs:';

export interface Job<T = unknown> {
  id: string;
  type: string;
  data: T;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  processedAt?: number;
  error?: string;
}

export type JobHandler<T = unknown> = (data: T) => Promise<void>;

export class JobQueue {
  private handlers: Map<string, JobHandler> = new Map();
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private processing: boolean = false;

  /**
   * Register a handler for a specific job type.
   * Only one handler per type is supported.
   */
  register<T>(type: string, handler: JobHandler<T>): void {
    this.handlers.set(type, handler as JobHandler);
    logger.info(`[JobQueue] Registered handler for job type: ${type}`);
  }

  /**
   * Add a job to the pending queue.
   *
   * @param type - The job type (must have a registered handler)
   * @param data - Job payload
   * @param maxAttempts - Maximum number of processing attempts (default: 3)
   * @returns The generated job ID
   */
  async enqueue<T>(type: string, data: T, maxAttempts: number = 3): Promise<string> {
    const redis = await getRedisClient();
    const id = `${type}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    const job: Job<T> = {
      id,
      type,
      data,
      status: 'pending',
      attempts: 0,
      maxAttempts,
      createdAt: Date.now(),
    };

    await redis.lPush(`${QUEUE_PREFIX}pending`, JSON.stringify(job));
    logger.info(`[JobQueue] Enqueued job ${id} of type ${type}`);
    return id;
  }

  /**
   * Start the polling loop that processes jobs from the queue.
   *
   * @param intervalMs - Polling interval in milliseconds (default: 5000)
   */
  start(intervalMs: number = 5000): void {
    if (this.pollingInterval) return;

    this.pollingInterval = setInterval(() => {
      if (!this.processing) {
        this.processNext().catch((err) =>
          logger.error('[JobQueue] Processing error:', { error: err })
        );
      }
    }, intervalMs);

    logger.info('[JobQueue] Started processing jobs');
  }

  /**
   * Stop the polling loop.
   */
  stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      logger.info('[JobQueue] Stopped processing jobs');
    }
  }

  /**
   * Process the next job from the pending queue.
   */
  private async processNext(): Promise<void> {
    this.processing = true;

    try {
      const redis = await getRedisClient();
      const jobStr = await redis.rPop(`${QUEUE_PREFIX}pending`);

      if (!jobStr) {
        this.processing = false;
        return;
      }

      const job: Job = JSON.parse(jobStr);
      const handler = this.handlers.get(job.type);

      if (!handler) {
        logger.warn(`[JobQueue] No handler for job type: ${job.type}`);
        this.processing = false;
        return;
      }

      job.attempts++;
      job.status = 'processing';
      job.processedAt = Date.now();

      try {
        await handler(job.data);
        job.status = 'completed';
        await redis.lPush(`${QUEUE_PREFIX}completed`, JSON.stringify(job));
        logger.info(`[JobQueue] Job ${job.id} completed successfully`);
      } catch (error) {
        job.error = error instanceof Error ? error.message : 'Unknown error';

        if (job.attempts < job.maxAttempts) {
          job.status = 'pending';
          // Re-queue for retry
          await redis.lPush(`${QUEUE_PREFIX}pending`, JSON.stringify(job));
          logger.warn(
            `[JobQueue] Job ${job.id} failed (attempt ${job.attempts}/${job.maxAttempts}), re-queued`,
            { error: job.error }
          );
        } else {
          job.status = 'failed';
          await redis.lPush(`${QUEUE_PREFIX}failed`, JSON.stringify(job));
          logger.error(
            `[JobQueue] Job ${job.id} failed after ${job.attempts} attempts:`,
            { error: job.error }
          );
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Get current queue statistics.
   */
  async getStats(): Promise<{ pending: number; completed: number; failed: number }> {
    try {
      const redis = await getRedisClient();
      const [pending, completed, failed] = await Promise.all([
        redis.lLen(`${QUEUE_PREFIX}pending`),
        redis.lLen(`${QUEUE_PREFIX}completed`),
        redis.lLen(`${QUEUE_PREFIX}failed`),
      ]);
      return { pending, completed, failed };
    } catch {
      return { pending: 0, completed: 0, failed: 0 };
    }
  }
}

// Singleton instance
export const jobQueue = new JobQueue();
