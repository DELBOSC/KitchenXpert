import { ApiError } from './api-error';

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: unknown;
  constraint?: string;
}

/**
 * Erreur de validation (400)
 */
export class ValidationError extends ApiError {
  public readonly errors: ValidationErrorDetail[];

  constructor(errors: ValidationErrorDetail[], message = 'Validation Error') {
    const details = { errors };
    super(message, 400, 'VALIDATION_ERROR', true, details);
    this.errors = errors;
  }

  static fromSingleField(
    field: string,
    message: string,
    value?: unknown,
    constraint?: string
  ): ValidationError {
    return new ValidationError([{ field, message, value, constraint }]);
  }

  override toJSON(): Record<string, unknown> {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        errors: this.errors,
      },
    };
  }
}
