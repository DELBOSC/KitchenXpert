/**
 * Configuration du client API
 */

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  retryAttempts?: number;
  retryDelay?: number;
  withCredentials?: boolean;
  onTokenRefresh?: () => Promise<string>;
  onUnauthorized?: () => void;
  debug?: boolean;
}

export const DEFAULT_CONFIG: Partial<ApiClientConfig> = {
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  withCredentials: true,
  debug: false,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
};

export function createConfig(config: ApiClientConfig): Required<ApiClientConfig> {
  return {
    baseUrl: config.baseUrl,
    timeout: config.timeout ?? DEFAULT_CONFIG.timeout!,
    headers: { ...DEFAULT_CONFIG.headers, ...config.headers },
    retryAttempts: config.retryAttempts ?? DEFAULT_CONFIG.retryAttempts!,
    retryDelay: config.retryDelay ?? DEFAULT_CONFIG.retryDelay!,
    withCredentials: config.withCredentials ?? DEFAULT_CONFIG.withCredentials!,
    onTokenRefresh:
      config.onTokenRefresh ??
      (async () => {
        throw new Error('Token refresh not configured');
      }),
    onUnauthorized: config.onUnauthorized ?? (() => {}),
    debug: config.debug ?? DEFAULT_CONFIG.debug!,
  };
}

export function getDefaultHeaders(): Record<string, string> {
  return { ...DEFAULT_CONFIG.headers };
}
