/**
 * Adapter basé sur Fetch API
 */

export interface FetchAdapterConfig {
  baseUrl: string;
  timeout?: number;
  defaultHeaders?: Record<string, string>;
  credentials?: 'omit' | 'same-origin' | 'include';
}

export interface HttpRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export class FetchAdapter {
  private config: FetchAdapterConfig;

  constructor(config: FetchAdapterConfig) {
    this.config = {
      ...config,
      timeout: config.timeout ?? 30000,
      credentials: config.credentials ?? 'include',
    };
  }

  async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    const url = this.buildUrl(request.url);
    const headers = this.buildHeaders(request.headers);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: request.signal ?? controller.signal,
        credentials: this.config.credentials,
      });

      clearTimeout(timeoutId);

      const data = await this.parseResponse<T>(response);
      const responseHeaders = this.extractHeaders(response.headers);

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.handleError(error);
    }
  }

  async get<T>(url: string, headers?: Record<string, string>): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'GET', url, headers });
  }

  async post<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'POST', url, body, headers });
  }

  async put<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'PUT', url, body, headers });
  }

  async patch<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'PATCH', url, body, headers });
  }

  async delete<T>(url: string, headers?: Record<string, string>): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'DELETE', url, headers });
  }

  private buildUrl(path: string): string {
    const base = this.config.baseUrl.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }

  private buildHeaders(custom?: Record<string, string>): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...this.config.defaultHeaders,
      ...custom,
    };
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (!response.ok) {
      const errorBody = contentType?.includes('application/json')
        ? await response.json()
        : await response.text();
      throw new FetchAdapterError(
        response.status,
        response.statusText,
        errorBody
      );
    }

    if (contentType?.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    return response.text() as Promise<T>;
  }

  private extractHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  private handleError(error: unknown): Error {
    if (error instanceof FetchAdapterError) {
      return error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new FetchAdapterError(408, 'Request Timeout', null);
      }
      return new FetchAdapterError(0, 'Network Error', error.message);
    }

    return new FetchAdapterError(0, 'Unknown Error', null);
  }
}

export class FetchAdapterError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown
  ) {
    super(`HTTP Error ${status}: ${statusText}`);
    this.name = 'FetchAdapterError';
  }
}

export function createFetchAdapter(config: FetchAdapterConfig): FetchAdapter {
  return new FetchAdapter(config);
}
