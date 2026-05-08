// =============================================================================
// ENVIRONMENT VALIDATION + TELEMETRY — MUST RUN BEFORE OTHER IMPORTS
//
// `validateEnv` exits the process if a required var is missing, so it has to
// fire before anything else that might dereference the missing var. OTel
// auto-instrumentation also has to wrap pg/express *before* they're imported,
// so we keep it on this same first import line.
// =============================================================================
import { authService } from './auth/auth.service';
import { config } from './config/app-config';
import { validateEnv } from './config/env-validator';
import { initTelemetry } from './core/telemetry';
import { prisma, connectPrisma, disconnectPrisma } from './database/client';
import { connectDatabase } from './database/connection';
import { getRedisClient, closeRedisConnection } from './database/redis-client';
import { startGdprPurgeScheduler, stopGdprPurgeScheduler } from './jobs/gdpr-scheduler';
import { jobQueue } from './jobs/job-queue';
import { startProviderSyncScheduler, stopProviderSyncScheduler } from './jobs/provider-sync-scheduler';
import { PrismaUserRepository } from './repositories';
import { createServer } from './server';
import { createEmailTokenService } from './services/email-token.service';
import logger from './utils/logger';
import { CollaborationWebSocketServer } from './websocket/server';

validateEnv();

// Start OpenTelemetry BEFORE bootstrap; no-op when OTEL_EXPORTER_OTLP_ENDPOINT isn't set.
void initTelemetry();

/**
 * Attempt to connect to the database with exponential backoff retry.
 * Delays: 1s, 2s, 4s, 8s, 16s (for maxRetries = 5)
 */
async function connectWithRetry(maxRetries = 5): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await connectDatabase();
      return;
    } catch (error) {
      lastError = error;
      const delayMs = 1000 * Math.pow(2, attempt);

      if (attempt < maxRetries - 1) {
        logger.warn(
          `[DATABASE] Connection attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delayMs}ms...`,
          { error: error instanceof Error ? error.message : String(error) }
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  logger.error(`[DATABASE] All ${maxRetries} connection attempts failed`);
  throw lastError;
}

async function bootstrap(): Promise<void> {
  try {
    // Connect to database (pg pool) with exponential backoff retry
    await connectWithRetry();
    logger.info('[DATABASE] Connected successfully');

    // Connect Prisma client
    await connectPrisma();

    // Initialize repositories and wire up services
    const userRepository = new PrismaUserRepository(prisma);
    authService.setUserRepository(userRepository);
    logger.info('[AUTH] UserRepository configured with Prisma');

    // Initialize email token service for email verification and password reset
    const emailTokenService = createEmailTokenService(prisma);
    authService.setEmailTokenService(emailTokenService);
    logger.info('[AUTH] EmailTokenService configured with Prisma');

    // Connect to Redis (optional — graceful degradation if unavailable)
    try {
      await getRedisClient();
      logger.info('[REDIS] Connected successfully');

      // Start background job processing now that Redis is available
      // Register job handlers before starting the queue
      jobQueue.register('send-email', async (data: { to: string; subject: string; template: string; templateData: Record<string, unknown> }) => {
        const { EmailService } = await import('./services/email.service');
        await EmailService.send({
          to: data.to,
          subject: data.subject,
          template: data.template as any,
          data: data.templateData,
        });
      });

      jobQueue.register('webhook-delivery', async (data: { webhookId: string; url: string; payload: Record<string, unknown>; secret?: string }) => {
        const body = JSON.stringify(data.payload);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };

        if (data.secret) {
          const crypto = await import('crypto');
          const signature = crypto.createHmac('sha256', data.secret).update(body).digest('hex');
          headers['X-Webhook-Signature'] = `sha256=${signature}`;
        }

        const response = await fetch(data.url, {
          method: 'POST',
          headers,
          body,
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(`Webhook delivery failed: ${response.status}`);
        }
      });

      jobQueue.register('catalog-sync', async (data: { providerId: string }) => {
        logger.info(`[Job] Catalog sync for provider ${data.providerId}`);
        // Placeholder - catalog sync logic
      });

      jobQueue.start();
      logger.info('[JOBQUEUE] Background job processing started');

      // Daily GDPR hard-delete purge — no-op unless GDPR_PURGE_ENABLED=1.
      startGdprPurgeScheduler();
      // 6-hourly provider catalog sync — no-op unless PROVIDER_SYNC_ENABLED=1.
      startProviderSyncScheduler();
    } catch (error) {
      logger.warn('[REDIS] Not available — token blacklisting, caching, and job queue will be degraded', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Create and start server
    const server = createServer();

    // Attach WebSocket server for collaboration
    const wsServer = new CollaborationWebSocketServer(server);

    server.listen(config.port, () => {
      logger.info(`[SERVER] Running on port ${config.port}`);
      logger.info(`[SERVER] Environment: ${config.env}`);
      logger.info(`[SERVER] API Base URL: http://localhost:${config.port}/api/v1`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`[SERVER] ${signal} received, shutting down gracefully...`);

      server.close(async () => {
        // Stop background job processing
        jobQueue.stop();
        stopGdprPurgeScheduler();
        stopProviderSyncScheduler();
        logger.info('[JOBQUEUE] Stopped');

        // Shutdown WebSocket server
        wsServer.shutdown();

        // Close Redis connection
        try {
          await closeRedisConnection();
          logger.info('[REDIS] Connection closed');
        } catch (redisErr) {
          logger.warn('[REDIS] Error closing connection:', { error: redisErr });
        }

        // Disconnect Prisma client
        await disconnectPrisma();
        logger.info('[SERVER] HTTP server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('[SERVER] Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('[SERVER] Failed to start:', error);
    process.exit(1);
  }
}

// ==================== GLOBAL PROCESS ERROR HANDLERS ====================

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('[PROCESS] Unhandled promise rejection', {
    reason: reason instanceof Error ? { message: reason.message, stack: reason.stack } : String(reason),
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('[PROCESS] Uncaught exception — shutting down', {
    message: error.message,
    stack: error.stack,
  });
  // Give logger time to flush, then exit
  setTimeout(() => process.exit(1), 1000);
});

// Top-level promise: any unhandled rejection is logged below; the `void`
// makes the floating-promise intent explicit so eslint stops flagging it.
void bootstrap();
