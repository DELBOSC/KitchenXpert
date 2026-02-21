/**
 * Intercepteur de gestion des erreurs
 */

export interface ErrorInterceptorConfig {
  onNetworkError?: (error: Error) => void;
  onServerError?: (status: number, data: unknown) => void;
  onValidationError?: (errors: ValidationError[]) => void;
  onUnauthorized?: () => void;
  onForbidden?: () => void;
  onNotFound?: (resource?: string) => void;
  onRateLimited?: (retryAfter?: number) => void;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  errors?: ValidationError[];
}

export class ErrorInterceptor {
  constructor(private config: ErrorInterceptorConfig) {}

  /**
   * Intercepte et traite les erreurs de réponse
   */
  handleError(status: number, data: unknown): void {
    const errorData = (data && typeof data === 'object' && 'code' in data) ? data as ApiErrorResponse : {} as ApiErrorResponse;

    switch (status) {
      case 400:
        if (errorData.errors) {
          this.config.onValidationError?.(errorData.errors);
        }
        break;

      case 401:
        this.config.onUnauthorized?.();
        break;

      case 403:
        this.config.onForbidden?.();
        break;

      case 404:
        this.config.onNotFound?.(errorData.details?.resource as string);
        break;

      case 429:
        const retryAfter = errorData.details?.retryAfter as number | undefined;
        this.config.onRateLimited?.(retryAfter);
        break;

      default:
        if (status >= 500) {
          this.config.onServerError?.(status, data);
        }
    }
  }

  /**
   * Traite les erreurs réseau
   */
  handleNetworkError(error: Error): void {
    this.config.onNetworkError?.(error);
  }

  /**
   * Formate une erreur pour l'affichage utilisateur
   */
  formatErrorMessage(status: number, data: unknown): string {
    const errorData = (data && typeof data === 'object' && 'message' in data) ? data as ApiErrorResponse : {} as ApiErrorResponse;

    if (errorData.message) {
      return errorData.message;
    }

    const defaultMessages: Record<number, string> = {
      400: 'Requête invalide',
      401: 'Authentification requise',
      403: 'Accès non autorisé',
      404: 'Ressource non trouvée',
      408: 'Délai d\'attente dépassé',
      429: 'Trop de requêtes, veuillez réessayer plus tard',
      500: 'Erreur serveur',
      502: 'Service temporairement indisponible',
      503: 'Service en maintenance',
    };

    return defaultMessages[status] || 'Une erreur est survenue';
  }

  /**
   * Vérifie si l'erreur est récupérable (peut être retentée)
   */
  isRetryable(status: number): boolean {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(status);
  }
}

export function createErrorInterceptor(config: ErrorInterceptorConfig): ErrorInterceptor {
  return new ErrorInterceptor(config);
}
