import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { type Application, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';

// Middleware
import { corsMiddleware } from './api/middleware/cors-middleware';
import { csrfProtection } from './api/middleware/csrf-middleware';
import { requestLogger } from './api/middleware/request-logger';
import { sanitizeInput } from './api/middleware/sanitize-middleware';
import { securityHeaders } from './api/middleware/security-headers';
// Routes (centralised barrel)
import apiRoutes from './api/routes/index';
// Config + error handlers
import { config } from './config/app-config';
import { setupSwagger } from './config/swagger';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found-handler';

export function createApp(): Application {
  const app = express();

  // Trust the reverse proxy (Caddy/Traefik/Nginx in front of the
  // container). Without this, req.ip is the proxy IP and every request
  // collapses into one rate-limit bucket. Default `1` = trust the first
  // hop; override via env if running behind multiple proxies.
  const trustProxyEnv = process.env.TRUST_PROXY;
  if (trustProxyEnv) {
    const n = Number(trustProxyEnv);
    app.set('trust proxy', Number.isFinite(n) ? n : trustProxyEnv);
  } else if (config.env === 'production') {
    app.set('trust proxy', 1);
  }

  // Security headers (Content-Security-Policy, X-Frame-Options, etc.)
  // This replaces the basic helmet() call with enhanced security configuration
  app.use(securityHeaders);

  // CORS configuration (environment-aware with dynamic origin validation)
  app.use(corsMiddleware);

  // Response compression (gzip/deflate)
  // Placed early so all subsequent responses benefit from compression.
  // threshold: 1024 — skip compressing responses smaller than 1KB (overhead not worth it)
  // level: 6 — balanced trade-off between compression ratio and CPU usage
  app.use(
    compression({
      threshold: 1024,
      level: 6,
    })
  );

  // Structured request logging (JSON in production, colored dev format in development)
  // Placed early to capture full response lifecycle including response time.
  // Skips health check endpoints to reduce log noise.
  if (config.env !== 'test') {
    app.use(requestLogger);
  }

  // Cookie parser (required for CSRF token handling)
  app.use(cookieParser());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: config.rateLimit.maxRequests,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use('/api/', limiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Input sanitization - sanitize all incoming data to prevent XSS
  app.use(sanitizeInput);

  // CSRF protection - validates tokens on state-changing requests
  // Note: Skips API requests with JWT Bearer tokens (they have inherent protection)
  app.use(csrfProtection);

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // All API routes (via centralized router)
  app.use('/api/v1', apiRoutes);

  // Swagger API documentation
  setupSwagger(app);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
