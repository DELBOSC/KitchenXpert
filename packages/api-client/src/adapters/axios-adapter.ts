/**
 * Adapter basé sur Axios (interface compatible)
 * Note: Axios doit être installé comme dépendance pour utiliser cet adapter
 */

export interface AxiosAdapterConfig {
  baseUrl: string;
  timeout?: number;
  defaultHeaders?: Record<string, string>;
  withCredentials?: boolean;
}

export interface AxiosRequestConfig {
  method: string;
  url: string;
  headers?: Record<string, string>;
  data?: unknown;
  params?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface AxiosResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: AxiosRequestConfig;
}

export interface AxiosInstance {
  request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  get<T>(url: string, config?: Partial<AxiosRequestConfig>): Promise<AxiosResponse<T>>;
  post<T>(
    url: string,
    data?: unknown,
    config?: Partial<AxiosRequestConfig>
  ): Promise<AxiosResponse<T>>;
  put<T>(
    url: string,
    data?: unknown,
    config?: Partial<AxiosRequestConfig>
  ): Promise<AxiosResponse<T>>;
  patch<T>(
    url: string,
    data?: unknown,
    config?: Partial<AxiosRequestConfig>
  ): Promise<AxiosResponse<T>>;
  delete<T>(url: string, config?: Partial<AxiosRequestConfig>): Promise<AxiosResponse<T>>;
}

/**
 * Wrapper autour d'Axios pour l'utilisation dans le client API
 * Utilisez cette classe si vous préférez Axios à Fetch
 */
export class AxiosAdapter {
  private config: AxiosAdapterConfig;
  private axiosInstance: AxiosInstance | null = null;

  constructor(config: AxiosAdapterConfig) {
    this.config = {
      ...config,
      timeout: config.timeout ?? 30000,
      withCredentials: config.withCredentials ?? true,
    };
  }

  /**
   * Initialise l'instance Axios
   * Note: Nécessite que axios soit importé dynamiquement
   */
  async init(): Promise<void> {
    try {
      // Import dynamique d'axios
      const axios = await import('axios');
      this.axiosInstance = axios.default.create({
        baseURL: this.config.baseUrl,
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...this.config.defaultHeaders,
        },
        withCredentials: this.config.withCredentials,
      });
    } catch {
      throw new Error('Axios is not installed. Please install axios: npm install axios');
    }
  }

  private ensureInitialized(): void {
    if (!this.axiosInstance) {
      throw new Error('AxiosAdapter not initialized. Call init() first.');
    }
  }

  async request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    this.ensureInitialized();
    return this.axiosInstance!.request<T>(config);
  }

  async get<T>(url: string, config?: Partial<AxiosRequestConfig>): Promise<AxiosResponse<T>> {
    this.ensureInitialized();
    return this.axiosInstance!.get<T>(url, config);
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: Partial<AxiosRequestConfig>
  ): Promise<AxiosResponse<T>> {
    this.ensureInitialized();
    return this.axiosInstance!.post<T>(url, data, config);
  }

  async put<T>(
    url: string,
    data?: unknown,
    config?: Partial<AxiosRequestConfig>
  ): Promise<AxiosResponse<T>> {
    this.ensureInitialized();
    return this.axiosInstance!.put<T>(url, data, config);
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: Partial<AxiosRequestConfig>
  ): Promise<AxiosResponse<T>> {
    this.ensureInitialized();
    return this.axiosInstance!.patch<T>(url, data, config);
  }

  async delete<T>(url: string, config?: Partial<AxiosRequestConfig>): Promise<AxiosResponse<T>> {
    this.ensureInitialized();
    return this.axiosInstance!.delete<T>(url, config);
  }

  /**
   * Ajoute un intercepteur de requête
   * Note: Cette méthode nécessiterait l'accès direct à axios.interceptors
   */
  addRequestInterceptor(
    _onFulfilled: (config: AxiosRequestConfig) => AxiosRequestConfig | Promise<AxiosRequestConfig>,
    _onRejected?: (error: unknown) => unknown
  ): number {
    this.ensureInitialized();
    console.warn('Request interceptors require direct axios access');
    return 0;
  }

  /**
   * Ajoute un intercepteur de réponse
   */
  addResponseInterceptor(
    _onFulfilled: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>,
    _onRejected?: (error: unknown) => unknown
  ): number {
    this.ensureInitialized();
    console.warn('Response interceptors require direct axios access');
    return 0;
  }
}

export async function createAxiosAdapter(config: AxiosAdapterConfig): Promise<AxiosAdapter> {
  const adapter = new AxiosAdapter(config);
  await adapter.init();
  return adapter;
}
