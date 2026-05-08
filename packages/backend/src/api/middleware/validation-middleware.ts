import { type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import { z, ZodError, type ZodSchema, type ZodIssue } from 'zod';

import { ApiValidationError, type ValidationErrorDetail } from '@kitchenxpert/common';

/**
 * Zod-based Input Validation Middleware
 *
 * Provides type-safe request validation using Zod schemas.
 * Automatically parses and validates request body, query parameters, and route params.
 *
 * USAGE EXAMPLES:
 * ===============
 *
 * 1. Validate request body:
 * ```typescript
 * const createUserSchema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 *   name: z.string().min(1).max(100),
 * });
 *
 * router.post('/users', validateBody(createUserSchema), createUserHandler);
 * ```
 *
 * 2. Validate query parameters:
 * ```typescript
 * const paginationSchema = z.object({
 *   page: z.coerce.number().int().positive().default(1),
 *   limit: z.coerce.number().int().min(1).max(100).default(20),
 *   sort: z.enum(['asc', 'desc']).optional(),
 * });
 *
 * router.get('/users', validateQuery(paginationSchema), listUsersHandler);
 * ```
 *
 * 3. Validate route parameters:
 * ```typescript
 * const idParamSchema = z.object({
 *   id: z.string().uuid(),
 * });
 *
 * router.get('/users/:id', validateParams(idParamSchema), getUserHandler);
 * ```
 *
 * 4. Validate multiple parts of the request:
 * ```typescript
 * router.put(
 *   '/users/:id',
 *   validateParams(idParamSchema),
 *   validateBody(updateUserSchema),
 *   updateUserHandler
 * );
 * ```
 *
 * 5. Using the combined validate function:
 * ```typescript
 * router.post(
 *   '/items/:id/comments',
 *   validate({
 *     params: idParamSchema,
 *     body: commentSchema,
 *     query: optionsSchema,
 *   }),
 *   addCommentHandler
 * );
 * ```
 *
 * TYPE INFERENCE:
 * ===============
 * The validated data is attached to req.body, req.query, or req.params
 * with proper TypeScript types inferred from the Zod schema:
 *
 * ```typescript
 * type CreateUserInput = z.infer<typeof createUserSchema>;
 * // { email: string; password: string; name: string }
 * ```
 */

/**
 * Configuration for validation behavior
 */
interface ValidationConfig {
  /** Strip unknown keys from the validated object (default: true) */
  stripUnknown?: boolean;
  /** Include the received value in error response (default: false for security) */
  includeValue?: boolean;
}

const defaultConfig: ValidationConfig = {
  stripUnknown: true,
  includeValue: false,
};

/**
 * Convert Zod errors to API validation error format
 */
function zodErrorToValidationErrors(
  error: ZodError,
  config: ValidationConfig = defaultConfig
): ValidationErrorDetail[] {
  return error.issues.map((issue: ZodIssue): ValidationErrorDetail => {
    const field = issue.path.join('.');
    const detail: ValidationErrorDetail = {
      field: field || 'unknown',
      message: issue.message,
      constraint: issue.code,
    };

    // Only include value if explicitly configured (security consideration)
    if (config.includeValue) {
      detail.value = 'received' in issue ? (issue as any).received : undefined;
    }

    return detail;
  });
}

/**
 * Validates request body against a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param config - Optional validation configuration
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * });
 *
 * router.post('/login', validateBody(schema), loginHandler);
 * ```
 */
export function validateBody<T extends ZodSchema>(
  schema: T,
  config: ValidationConfig = defaultConfig
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ApiValidationError(zodErrorToValidationErrors(error, config));
      }
      throw error;
    }
  };
}

/**
 * Validates query parameters against a Zod schema
 *
 * Note: Query parameters are always strings, so use z.coerce for number/boolean conversion
 *
 * @param schema - Zod schema to validate against
 * @param config - Optional validation configuration
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   page: z.coerce.number().int().positive().default(1),
 *   search: z.string().optional(),
 * });
 *
 * router.get('/items', validateQuery(schema), listItemsHandler);
 * ```
 */
export function validateQuery<T extends ZodSchema>(
  schema: T,
  config: ValidationConfig = defaultConfig
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ApiValidationError(zodErrorToValidationErrors(error, config));
      }
      throw error;
    }
  };
}

/**
 * Validates route parameters against a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param config - Optional validation configuration
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   id: z.string().uuid(),
 * });
 *
 * router.get('/users/:id', validateParams(schema), getUserHandler);
 * ```
 */
export function validateParams<T extends ZodSchema>(
  schema: T,
  config: ValidationConfig = defaultConfig
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ApiValidationError(zodErrorToValidationErrors(error, config));
      }
      throw error;
    }
  };
}

/**
 * Combined validation schema interface
 */
export interface CombinedValidationSchema {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Validates multiple parts of the request in a single middleware
 *
 * @param schemas - Object containing Zod schemas for body, query, and/or params
 * @param config - Optional validation configuration
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * router.put(
 *   '/users/:id',
 *   validate({
 *     params: z.object({ id: z.string().uuid() }),
 *     body: z.object({ name: z.string(), email: z.string().email() }),
 *   }),
 *   updateUserHandler
 * );
 * ```
 */
export function validate(
  schemas: CombinedValidationSchema,
  config: ValidationConfig = defaultConfig
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const allErrors: ValidationErrorDetail[] = [];

    // Validate params
    if (schemas.params) {
      try {
        req.params = schemas.params.parse(req.params);
      } catch (error) {
        if (error instanceof ZodError) {
          allErrors.push(...zodErrorToValidationErrors(error, config));
        } else {
          throw error;
        }
      }
    }

    // Validate query
    if (schemas.query) {
      try {
        req.query = schemas.query.parse(req.query);
      } catch (error) {
        if (error instanceof ZodError) {
          allErrors.push(...zodErrorToValidationErrors(error, config));
        } else {
          throw error;
        }
      }
    }

    // Validate body
    if (schemas.body) {
      try {
        req.body = schemas.body.parse(req.body);
      } catch (error) {
        if (error instanceof ZodError) {
          allErrors.push(...zodErrorToValidationErrors(error, config));
        } else {
          throw error;
        }
      }
    }

    // If there are validation errors, throw them all together
    if (allErrors.length > 0) {
      throw new ApiValidationError(allErrors);
    }

    next();
  };
}

/**
 * Common Zod schemas for reuse across the application
 *
 * @example
 * ```typescript
 * import { commonSchemas } from './validation-middleware';
 *
 * const userQuerySchema = z.object({
 *   ...commonSchemas.pagination.shape,
 *   status: z.enum(['active', 'inactive']).optional(),
 * });
 * ```
 */
export const commonSchemas = {
  /** UUID validation */
  uuid: z.string().uuid('Invalid UUID format'),

  /** Email validation */
  email: z.string().email('Invalid email format').toLowerCase().trim(),

  /** Pagination parameters */
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),

  /** Sort parameters */
  sort: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),

  /** ID parameter (for route params) */
  idParam: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),

  /** Password validation (min 8 chars, mixed case, numbers) */
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  /** Date range for filtering */
  dateRange: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }),
};

