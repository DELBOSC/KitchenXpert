/**
 * API Server
 *
 * REST API for KitchenXpert to access scraped data
 */

import express, { Request, Response, NextFunction, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { logger } from '../utils/logger.js';
import { createCabinetsRouter } from './routes/cabinets.js';
import { createWorktopsRouter } from './routes/worktops.js';
import { createFacadesRouter } from './routes/facades.js';
import { createAppliancesRouter } from './routes/appliances.js';
import { createBrandsRouter } from './routes/brands.js';
import { createSearchRouter } from './routes/search.js';
import { createScrapingRouter } from './routes/scraping.js';
import { createStatsRouter } from './routes/stats.js';

const PORT = parseInt(process.env.API_PORT || '3100', 10);
const HOST = process.env.API_HOST || 'localhost';

export interface ApiContext {
  // Add database client, cache, etc. as needed
}

/**
 * Create and configure the Express app
 */
export function createApp(_context?: ApiContext): express.Application {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for API
  }));

  // CORS
  app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3005'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  }));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.debug(`${req.method} ${req.path}`, {
      query: req.query,
      ip: req.ip,
    });
    next();
  });

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  // API key authentication middleware
  const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.SCRAPER_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }
    next();
  };

  // API routes
  const apiRouter = Router();

  apiRouter.use('/cabinets', createCabinetsRouter());
  apiRouter.use('/worktops', createWorktopsRouter());
  apiRouter.use('/facades', createFacadesRouter());
  apiRouter.use('/appliances', createAppliancesRouter());
  apiRouter.use('/brands', createBrandsRouter());
  apiRouter.use('/search', createSearchRouter());
  apiRouter.use('/scraping', requireApiKey, createScrapingRouter());
  apiRouter.use('/stats', requireApiKey, createStatsRouter());

  app.use('/api/v1', apiRouter);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found',
    });
  });

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('API Error', { error: err.message, stack: err.stack });

    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    });
  });

  return app;
}

/**
 * Start the API server
 */
export async function startServer(): Promise<void> {
  const app = createApp();

  app.listen(PORT, HOST, () => {
    logger.info(`API server running at http://${HOST}:${PORT}`);
    logger.info(`Health check: http://${HOST}:${PORT}/health`);
    logger.info(`API docs: http://${HOST}:${PORT}/api/v1`);
  });
}

// Run if called directly
if (process.argv[1]?.includes('server')) {
  startServer().catch((error) => {
    logger.error('Failed to start server', { error });
    process.exit(1);
  });
}

export default createApp;
