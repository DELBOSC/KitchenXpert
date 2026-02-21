import { ApiError } from './api-error';

/**
 * Erreur d'autorisation (403) - utilisé pour les permissions
 */
export class AuthorizationError extends ApiError {
  constructor(
    resource?: string,
    action?: string,
    message = 'You do not have permission to perform this action'
  ) {
    const details = resource
      ? { resource, ...(action && { action }) }
      : undefined;

    super(message, 403, 'AUTHORIZATION_ERROR', true, details);
  }
}
