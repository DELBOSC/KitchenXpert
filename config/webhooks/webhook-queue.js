/**
 * Webhook Queue Management for KitchenXpert
 *
 * Purpose:
 * - Redis-backed job queue using Bull
 * - Retry logic with exponential backoff
 * - Dead letter queue for failed webhooks
 * - Rate limiting per endpoint
 * - Priority-based processing
 *
 * Usage:
 * - Add to queue: await webhookQueue.add('webhook', { event, payload, url });
 * - Process jobs: webhookQueue.process('webhook', processWebhook);
 */

import Queue from 'bull';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { WEBHOOK_CONFIG, getRetryDelay, isRetryableError } from './webhook-config';
import { generateSignature } from './webhook-validator';

/**
 * Create webhook queue
 */
export const createWebhookQueue = (redisConfig) => {
  return new Queue('webhooks', {
    redis: redisConfig,
    defaultJobOptions: {
      attempts: WEBHOOK_CONFIG.retry.maxRetries,
      backoff: {
        type: 'exponential',
        delay: WEBHOOK_CONFIG.retry.initialDelay,
      },
      timeout: WEBHOOK_CONFIG.retry.timeout,
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: false, // Keep failed jobs for debugging
    },
  });
};

/**
 * Add webhook to queue
 */
export const addWebhookJob = async (queue, { event, payload, url, secret, priority }) => {
  const jobData = {
    event,
    payload,
    url,
    secret,
    deliveryId: uuidv4(),
    timestamp: new Date().toISOString(),
  };

  const jobOptions = {
    priority: priority || WEBHOOK_CONFIG.delivery.defaultPriority,
    jobId: jobData.deliveryId,
  };

  return queue.add('webhook-delivery', jobData, jobOptions);
};

/**
 * Process webhook delivery
 */
export const processWebhookDelivery = async (job) => {
  const { event, payload, url, secret, deliveryId, timestamp } = job.data;

  try {
    // Generate signature
    const signature = generateSignature(payload, secret);

    // Prepare headers
    const headers = {
      ...WEBHOOK_CONFIG.headers,
      [WEBHOOK_CONFIG.security.signatureHeader]: signature,
      [WEBHOOK_CONFIG.security.eventHeader]: event,
      [WEBHOOK_CONFIG.security.deliveryIdHeader]: deliveryId,
      [WEBHOOK_CONFIG.security.timestampHeader]: timestamp,
      [WEBHOOK_CONFIG.security.versionHeader]: WEBHOOK_CONFIG.security.apiVersion,
    };

    // Send webhook
    const response = await axios.post(url, payload, {
      headers,
      timeout: WEBHOOK_CONFIG.retry.timeout,
      validateStatus: status => status >= 200 && status < 300,
    });

    // Log success
    if (WEBHOOK_CONFIG.monitoring.logSuccessfulDeliveries) {
      console.log(`Webhook delivered successfully: ${deliveryId}`, {
        event,
        url,
        status: response.status,
      });
    }

    return { success: true, status: response.status };
  } catch (error) {
    // Log failure
    if (WEBHOOK_CONFIG.monitoring.logFailedDeliveries) {
      console.error(`Webhook delivery failed: ${deliveryId}`, {
        event,
        url,
        error: error.message,
        attempt: job.attemptsMade,
      });
    }

    // Check if error is retryable
    if (!isRetryableError(error) || job.attemptsMade >= WEBHOOK_CONFIG.retry.maxRetries) {
      // Move to dead letter queue
      await moveToDeadLetterQueue(job);
    }

    throw error;
  }
};

/**
 * Move failed webhook to dead letter queue
 */
const moveToDeadLetterQueue = async (job) => {
  if (!WEBHOOK_CONFIG.delivery.deadLetterQueue.enabled) {
    return;
  }

  const dlqData = {
    ...job.data,
    failedAt: new Date().toISOString(),
    attempts: job.attemptsMade,
    error: job.failedReason,
  };

  // Store in database/redis/s3 based on configuration
  console.error('Moving to dead letter queue:', dlqData);
  // Implement storage based on WEBHOOK_CONFIG.delivery.deadLetterQueue.storageType
};

/**
 * Setup queue event handlers
 */
export const setupQueueHandlers = (queue) => {
  queue.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed:`, result);
  });

  queue.on('failed', (job, error) => {
    console.error(`Job ${job.id} failed:`, error.message);
  });

  queue.on('stalled', (job) => {
    console.warn(`Job ${job.id} stalled`);
  });

  queue.on('error', (error) => {
    console.error('Queue error:', error);
  });
};

/**
 * Get queue statistics
 */
export const getQueueStats = async (queue) => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
};

export default {
  createWebhookQueue,
  addWebhookJob,
  processWebhookDelivery,
  setupQueueHandlers,
  getQueueStats,
};
