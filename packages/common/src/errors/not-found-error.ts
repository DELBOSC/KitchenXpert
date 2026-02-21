import { ApiError } from './api-error';

/**
 * Erreur ressource non trouvée (404)
 */
export class NotFoundError extends ApiError {
  constructor(resource?: string, id?: string) {
    const message = resource
      ? id
        ? `${resource} with id '${id}' not found`
        : `${resource} not found`
      : 'Resource not found';

    const details = resource ? { resource, ...(id && { id }) } : undefined;

    super(message, 404, 'NOT_FOUND', true, details);
  }
}
