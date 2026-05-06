/**
 * OpenTelemetry bootstrap.
 *
 * This file is intentionally dependency-light: we expose a single
 * `initTelemetry()` entry point that lazily requires `@opentelemetry/*`
 * modules only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. That lets us ship
 * the hook without forcing the peer dep on every developer machine.
 *
 * To enable in production:
 *   1. `pnpm add @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
 *                @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources
 *                @opentelemetry/semantic-conventions`
 *   2. Set `OTEL_SERVICE_NAME=kitchenxpert-backend`
 *      and `OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.internal:4318`
 *   3. Invoke `initTelemetry()` BEFORE any other import in `index.ts`.
 *
 * Why lazy require rather than top-level import? Because OTel must be
 * registered before instrumented libraries (express, http, pg) are loaded,
 * which means we have to hoist the call — but we still want builds to
 * succeed when the deps aren't installed yet.
 */

import { createModuleLogger } from '../utils/logger';
const logger = createModuleLogger('telemetry');

export async function initTelemetry(): Promise<void> {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) {
    logger.info('OTEL disabled — OTEL_EXPORTER_OTLP_ENDPOINT not set');
    return;
  }

  try {
    // Dynamic import so the backend still boots if deps are missing.
    const sdkMod = await import('@opentelemetry/sdk-node' as string).catch(() => null);
    const autoMod = await import('@opentelemetry/auto-instrumentations-node' as string).catch(() => null);
    const exporterMod = await import('@opentelemetry/exporter-trace-otlp-http' as string).catch(() => null);
    const resourcesMod = await import('@opentelemetry/resources' as string).catch(() => null);
    const semconvMod = await import('@opentelemetry/semantic-conventions' as string).catch(() => null);

    if (!sdkMod || !autoMod || !exporterMod || !resourcesMod || !semconvMod) {
      logger.warn('OTEL packages not installed — skipping tracing. See telemetry.ts for install instructions.');
      return;
    }

    const sdk = new sdkMod.NodeSDK({
      resource: new resourcesMod.Resource({
        [semconvMod.SemanticResourceAttributes.SERVICE_NAME]:
          process.env.OTEL_SERVICE_NAME || 'kitchenxpert-backend',
        [semconvMod.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
          process.env.NODE_ENV || 'development',
      }),
      traceExporter: new exporterMod.OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
      instrumentations: [autoMod.getNodeAutoInstrumentations({
        // HTTP + Express + PG + Redis auto-covered; disable fs noise.
        '@opentelemetry/instrumentation-fs': { enabled: false },
      })],
    });

    await sdk.start();
    logger.info('OTEL tracing started', { endpoint });

    const shutdown = async (): Promise<void> => {
      try { await sdk.shutdown(); logger.info('OTEL shutdown clean'); } catch (e) { logger.warn('OTEL shutdown failed', { e }); }
    };
    process.on('SIGTERM', () => void shutdown());
    process.on('SIGINT', () => void shutdown());
  } catch (e) {
    logger.error('OTEL init failed', { error: e instanceof Error ? e.message : String(e) });
  }
}
