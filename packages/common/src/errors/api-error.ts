/**
 * Classe de base pour toutes les erreurs API
 */
export abstract class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

/**
 * Erreur de requête incorrecte (400)
 */
export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', details?: Record<string, unknown>) {
    super(message, 400, 'BAD_REQUEST', true, details);
  }
}

/**
 * Erreur d'authentification (401)
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', details?: Record<string, unknown>) {
    super(message, 401, 'UNAUTHORIZED', true, details);
  }
}

/**
 * Erreur d'accès interdit (403)
 */
export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden', details?: Record<string, unknown>) {
    super(message, 403, 'FORBIDDEN', true, details);
  }
}

/**
 * Erreur de conflit (409)
 */
export class ConflictError extends ApiError {
  constructor(message = 'Conflict', details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', true, details);
  }
}

/**
 * Erreur interne du serveur (500)
 */
export class InternalServerError extends ApiError {
  constructor(message = 'Internal Server Error', details?: Record<string, unknown>) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', false, details);
  }
}

/**
 * Erreur de service non disponible (503)
 */
export class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service Unavailable', details?: Record<string, unknown>) {
    super(message, 503, 'SERVICE_UNAVAILABLE', true, details);
  }
}
