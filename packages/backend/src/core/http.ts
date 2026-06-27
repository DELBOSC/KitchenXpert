import { DomainErrors, errorToBody, errorToStatus, type Result } from './result';

import type { UseCase } from './use-case';
import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Adapter that runs a Zod schema then a UseCase, writing the HTTP response.
 *
 * Controllers become one-liners:
 *
 *   router.post('/register', runUseCase(registerSchema, registerUseCase,
 *     (body, req) => ({ ...body, ip: req.ip })));
 */
export function runUseCase<Body, Input, Output>(
  schema: ZodSchema<Body>,
  useCase: UseCase<Input, Output>,
  toInput: (body: Body, req: Request) => Input,
  onSuccess?: (value: Output, res: Response) => void
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      const error = DomainErrors.validation('Validation failed', issues);
      res.status(errorToStatus(error)).json(errorToBody(error));
      return;
    }
    try {
      const outcome: Result<Output> = await useCase.execute(toInput(parsed.data, req));
      if (!outcome.ok) {
        res.status(errorToStatus(outcome.error)).json(errorToBody(outcome.error));
        return;
      }
      if (onSuccess) {
        onSuccess(outcome.value, res);
      } else {
        res.status(200).json({ data: outcome.value });
      }
    } catch (uncaught) {
      // Genuine programmer errors / missing guards bubble here.
      next(uncaught);
    }
  };
}
