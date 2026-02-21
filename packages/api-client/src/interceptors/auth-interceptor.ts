/**
 * Intercepteur d'authentification
 */

export interface AuthInterceptorConfig {
  getAccessToken: () => string | null;
  onTokenExpired?: () => void;
  excludePaths?: string[];
}

export interface RequestConfig {
  url: string;
  headers: Record<string, string>;
}

export interface ResponseConfig {
  status: number;
  data: unknown;
}

export class AuthInterceptor {
  constructor(private config: AuthInterceptorConfig) {}

  /**
   * Intercepte la requête pour ajouter le token d'authentification
   */
  interceptRequest(request: RequestConfig): RequestConfig {
    // Vérifier si le path est exclu
    if (this.isExcludedPath(request.url)) {
      return request;
    }

    const token = this.config.getAccessToken();

    if (token) {
      return {
        ...request,
        headers: {
          ...request.headers,
          Authorization: `Bearer ${token}`,
        },
      };
    }

    return request;
  }

  /**
   * Intercepte la réponse pour gérer les erreurs d'authentification
   */
  interceptResponse(response: ResponseConfig): ResponseConfig {
    if (response.status === 401) {
      this.config.onTokenExpired?.();
    }

    return response;
  }

  private isExcludedPath(url: string): boolean {
    const excludePaths = this.config.excludePaths || [
      '/auth/login',
      '/auth/register',
      '/auth/refresh',
      '/auth/password-reset',
    ];

    return excludePaths.some((path) => url.includes(path));
  }
}

export function createAuthInterceptor(config: AuthInterceptorConfig): AuthInterceptor {
  return new AuthInterceptor(config);
}
