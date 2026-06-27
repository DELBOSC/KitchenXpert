/**
 * @kitchenxpert/api-client
 * Client API pour KitchenXpert
 */

// Internal imports for use in functions
import { createApiClient as createApiClientFn } from './client';
import type { ApiClientConfig as ApiClientConfigType } from './config';
import { createAuthEndpoints as createAuthEndpointsFn } from './endpoints/auth-endpoints';
import { createUserEndpoints as createUserEndpointsFn } from './endpoints/user-endpoints';
import { createKitchenEndpoints as createKitchenEndpointsFn } from './endpoints/kitchen-endpoints';
import { createCatalogEndpoints as createCatalogEndpointsFn } from './endpoints/catalog-endpoints';
import { createProjectEndpoints as createProjectEndpointsFn } from './endpoints/project-endpoints';

// Core
export { ApiClient, createApiClient, ApiClientError } from './client';
export type { ApiResponse, RequestOptions, HttpMethod } from './client';
export { createConfig, DEFAULT_CONFIG } from './config';
export type { ApiClientConfig } from './config';

// Endpoints
export { AuthEndpoints, createAuthEndpoints } from './endpoints/auth-endpoints';
export type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RefreshTokenResponse,
  PasswordResetRequest,
  PasswordResetConfirm,
  ChangePasswordRequest,
} from './endpoints/auth-endpoints';

export { UserEndpoints, createUserEndpoints } from './endpoints/user-endpoints';
export type {
  User,
  UpdateProfileRequest,
  UserPreferences,
  PaginatedUsers,
  UserSearchParams,
} from './endpoints/user-endpoints';

export { KitchenEndpoints, createKitchenEndpoints } from './endpoints/kitchen-endpoints';
export type {
  KitchenProject,
  ProjectItem,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectSearchParams,
  PaginatedProjects,
  ProjectExport,
  ProjectShare,
} from './endpoints/kitchen-endpoints';

export { CatalogEndpoints, createCatalogEndpoints } from './endpoints/catalog-endpoints';
export type {
  CatalogItem,
  CatalogSearchParams,
  PaginatedCatalog,
  CatalogFacets,
  CatalogCategory,
  CatalogProvider,
} from './endpoints/catalog-endpoints';

export { ProjectEndpoints, createProjectEndpoints } from './endpoints/project-endpoints';
export type {
  ProjectQuote,
  QuoteItem,
  ProjectOrder,
  Address,
  ProjectCollaborator,
  ProjectActivity,
} from './endpoints/project-endpoints';

// Interceptors
export { AuthInterceptor, createAuthInterceptor } from './interceptors/auth-interceptor';
export type { AuthInterceptorConfig } from './interceptors/auth-interceptor';

export { ErrorInterceptor, createErrorInterceptor } from './interceptors/error-interceptor';
export type { ErrorInterceptorConfig, ValidationError } from './interceptors/error-interceptor';

export { LoggerInterceptor, createLoggerInterceptor } from './interceptors/logger-interceptor';
export type {
  LoggerInterceptorConfig,
  Logger,
  LogLevel,
  RequestLog,
  ResponseLog,
} from './interceptors/logger-interceptor';

// Adapters
export { FetchAdapter, FetchAdapterError, createFetchAdapter } from './adapters/fetch-adapter';
export type { FetchAdapterConfig, HttpRequest, HttpResponse } from './adapters/fetch-adapter';

export { AxiosAdapter, createAxiosAdapter } from './adapters/axios-adapter';
export type {
  AxiosAdapterConfig,
  AxiosRequestConfig,
  AxiosResponse,
} from './adapters/axios-adapter';

/**
 * Crée une instance complète du client API avec tous les endpoints
 */
export function createKitchenXpertClient(config: ApiClientConfigType) {
  const client = createApiClientFn(config);

  return {
    client,
    auth: createAuthEndpointsFn(client),
    users: createUserEndpointsFn(client),
    kitchen: createKitchenEndpointsFn(client),
    catalog: createCatalogEndpointsFn(client),
    projects: createProjectEndpointsFn(client),
  };
}

export type KitchenXpertClient = ReturnType<typeof createKitchenXpertClient>;
