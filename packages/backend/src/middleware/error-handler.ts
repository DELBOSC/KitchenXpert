import { type Request, type Response, type NextFunction } from 'express';

import { ApiError } from '@kitchenxpert/common';

import logger from '../utils/logger';

/**
 * Unified error handler supporting both ApiError (modern) and plain Error objects.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle ApiError (from @kitchenxpert/common)
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error('[ERROR]', {
        message: err.message,
        stack: err.stack,
        code: err.code,
        statusCode: err.statusCode,
      });
    }

    res.status(err.statusCode).json({
      success: false,
      ...err.toJSON(),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  // Handle plain Error or unknown error shapes
  const statusCode = (err as any).statusCode || 500;
  const isOperational = (err as any).isOperational ?? false;
  const code = (err as any).code || 'INTERNAL_ERROR';

  if (!isOperational || statusCode >= 500) {
    logger.error('[ERROR]', {
      message: err.message,
      stack: err.stack,
      code,
      statusCode,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message: isOperational ? err.message : 'Internal server error',
      code,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

export default errorHandler;
