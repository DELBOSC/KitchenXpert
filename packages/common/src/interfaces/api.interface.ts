/**
 * Interfaces pour les services API
 */

import { ApiResponse, PaginatedResponse, PaginationParams } from '../types/base.types';

/**
 * Interface générique pour un service CRUD
 */
export interface ICrudService<T, CreateDTO, UpdateDTO> {
  findAll(params?: PaginationParams): Promise<PaginatedResponse<T>>;
  findById(id: string): Promise<T | null>;
  create(data: CreateDTO): Promise<T>;
  update(id: string, data: UpdateDTO): Promise<T>;
  delete(id: string): Promise<void>;
}

/**
 * Interface pour un service avec recherche
 */
export interface ISearchableService<T, SearchParams> {
  search(params: SearchParams): Promise<PaginatedResponse<T>>;
}

/**
 * Interface pour un service avec soft delete
 */
export interface ISoftDeletableService<T> {
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<T>;
  findDeleted(params?: PaginationParams): Promise<PaginatedResponse<T>>;
}

/**
 * Interface pour un client HTTP
 */
export interface IHttpClient {
  get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>>;
  put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>>;
  patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>>;
  delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  timeout?: number;
  signal?: AbortSignal;
  withCredentials?: boolean;
}

/**
 * Interface pour l'authentification
 */
export interface IAuthService {
  login(email: string, password: string): Promise<AuthResult>;
  logout(): Promise<void>;
  refreshToken(): Promise<AuthResult>;
  getCurrentUser(): Promise<UserInfo | null>;
  isAuthenticated(): boolean;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

/**
 * Interface pour la gestion du cache
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(pattern?: string): Promise<void>;
  has(key: string): Promise<boolean>;
}

/**
 * Interface pour les événements
 */
export interface IEventEmitter {
  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  emit(event: string, data?: unknown): void;
  once(event: string, handler: EventHandler): void;
}

export type EventHandler = (data?: unknown) => void | Promise<void>;

/**
 * Interface pour le logging
 */
export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
}
