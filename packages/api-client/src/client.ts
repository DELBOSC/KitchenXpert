/**
 * Client API principal pour KitchenXpert
 */

import { ApiClientConfig, createConfig } from './config';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  signal?: AbortSignal;
  timeout?: number;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class ApiClient {
  private config: Required<ApiClientConfig>;
  private accessToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;

  constructor(config: ApiClientConfig) {
    this.config = createConfig(config);
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, undefined, options);
  }

  async post<T>(path: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, data, options);
  }

  async put<T>(path: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, data, options);
  }

  async patch<T>(path: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, data, options);
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    data?: unknown,
    options?: RequestOptions,
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path, options?.params);
    const headers = this.buildHeaders(options?.headers, data);
    const timeout = options?.timeout ?? this.config.timeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      if (this.config.debug) {
        console.log(`[API] ${method} ${url}`);
      }

      const response = await fetch(url, {
        method,
        headers,
        body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
        signal: options?.signal ?? controller.signal,
        credentials: this.config.withCredentials ? 'include' : 'same-origin',
      });

      clearTimeout(timeoutId);

      const responseHeaders = this.parseHeaders(response.headers);
      const responseData = await this.parseResponse<T>(response);

      if (this.config.debug) {
        console.log(`[API] Response ${response.status}`);
      }

      if (!response.ok) {
        // Handle 401 Unauthorized
        if (response.status === 401 && retryCount === 0) {
          try {
            const newToken = await this.refreshToken();
            this.accessToken = newToken;
            return this.request<T>(method, path, data, options, retryCount + 1);
          } catch {
            this.config.onUnauthorized();
            throw new ApiClientError(
              'Unauthorized',
              401,
              'UNAUTHORIZED'
            );
          }
        }

        const error = responseData as unknown as ApiError;
        throw new ApiClientError(
          error.message || 'Request failed',
          response.status,
          error.code || 'UNKNOWN_ERROR',
          error.details
        );
      }

      return {
        data: responseData,
        status: response.status,
        headers: responseHeaders,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiClientError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiClientError('Request timeout', 408, 'TIMEOUT');
      }

      // Retry on network errors
      if (retryCount < this.config.retryAttempts) {
        await this.delay(this.config.retryDelay * (retryCount + 1));
        return this.request<T>(method, path, data, options, retryCount + 1);
      }

      throw new ApiClientError(
        error instanceof Error ? error.message : 'Network error',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  private async refreshToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.config.onTokenRefresh();

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  private buildUrl(path: string, params?: Record<string, unknown>): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${baseUrl}${cleanPath}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private buildHeaders(customHeaders?: Record<string, string>, data?: unknown): Record<string, string> {
    const headers: Record<string, string> = {
      ...this.config.headers,
      ...customHeaders,
    };

    if (data instanceof FormData) {
      delete headers['Content-Type'];
    } else if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    if (contentType?.includes('text/')) {
      return response.text() as Promise<T>;
    }

    return response.blob() as Promise<T>;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
