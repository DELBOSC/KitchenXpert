/**
 * Centralized API Client for KitchenXpert Frontend
 * Uses httpOnly cookies for authentication (no localStorage tokens).
 * Cookies are sent automatically with credentials: 'include'.
 */

import { API_BASE_URL, API_ENDPOINTS } from './endpoints';

// Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
}

// Build URL with query params
const buildUrl = (path: string, params?: Record<string, string | number | boolean | undefined>): string => {
  if (!params || Object.keys(params).length === 0) {
    return path;
  }
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  return `${path}?${searchParams.toString()}`;
};

// Track whether a refresh is in progress to avoid concurrent refreshes
let refreshPromise: Promise<boolean> | null = null;

// Main request function
async function request<T>(
  endpoint: string,
  config: RequestConfig = {},
  _retried = false,
): Promise<ApiResponse<T>> {
  const { params, timeout = 30000, ...fetchConfig } = config;

  // Set default headers (cookies sent automatically via credentials: 'include')
  fetchConfig.headers = {
    'Content-Type': 'application/json',
    ...fetchConfig.headers,
  };
  fetchConfig.credentials = 'include';

  // Build full URL
  const url = buildUrl(`${API_BASE_URL}${endpoint}`, params);

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchConfig,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 401 - try to refresh token ONCE (no infinite loop)
    if (response.status === 401 && !_retried) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return request<T>(endpoint, config, true);
      } else {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        throw new Error('Session expired');
      }
    }

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || {
          code: `HTTP_${response.status}`,
          message: data.message || response.statusText,
        },
      };
    }

    return {
      success: true,
      data: data.data ?? data,
      meta: data.meta,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'Request timed out',
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

// Refresh token logic — uses httpOnly cookie, no localStorage
async function refreshAccessToken(): Promise<boolean> {
  // If a refresh is already in progress, wait for it instead of starting a new one
  if (refreshPromise) {return refreshPromise;}

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      return response.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// HTTP method helpers
export const api = {
  get: <T>(endpoint: string, config?: RequestConfig) =>
    request<T>(endpoint, { ...config, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, config?: RequestConfig) =>
    request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, config?: RequestConfig) =>
    request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, config?: RequestConfig) =>
    request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, config?: RequestConfig) =>
    request<T>(endpoint, { ...config, method: 'DELETE' }),
};

export default api;
