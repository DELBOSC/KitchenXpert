import { type Request, type Response, type NextFunction } from 'express';

// Re-export the canonical errorHandler from its single source of truth.
// This avoids a duplicate global error handler while keeping existing imports working.
export { errorHandler } from '../../middleware/error-handler';

/**
 * Middleware pour gérer les routes non trouvées (404)
 */
export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      details: {
        method: req.method,
        path: req.path,
      },
    },
  });
};

/**
 * Wrapper pour gérer les erreurs async dans les contrôleurs
 * Usage: asyncHandler(async (req, res, next) => { ... })
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
