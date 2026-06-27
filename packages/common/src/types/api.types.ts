/**
 * Types API communs pour KitchenXpert
 * Note: Les types de base ApiResponse, PaginatedResponse et PaginationParams
 * sont définis dans base.types.ts pour éviter les duplications
 */

import { ApiResponse, PaginatedResponse, PaginationParams } from './base.types';

// Re-export pour compatibilité
export type { ApiResponse, PaginatedResponse, PaginationParams };

// Extended API error response with more details
export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode?: number;
  path?: string;
  timestamp?: string;
}

export interface ResponseMeta {
  timestamp?: string;
  requestId?: string;
  version?: string;
  processingTime?: number;
}

// Request types
export interface ApiRequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  timeout?: number;
  signal?: AbortSignal;
}

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Filter and Search
export interface FilterParams {
  search?: string;
  filters?: Record<string, unknown>;
  dateFrom?: string;
  dateTo?: string;
}

export interface SearchParams extends PaginationParams, FilterParams {}

// Batch operations
export interface BatchRequest<T> {
  items: T[];
  options?: {
    continueOnError?: boolean;
    validateOnly?: boolean;
  };
}

export interface BatchResponse<T> {
  success: boolean;
  results: Array<{
    index: number;
    success: boolean;
    data?: T;
    error?: ApiErrorResponse;
  }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

// Health check
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services?: Record<
    string,
    {
      status: 'up' | 'down';
      latency?: number;
      message?: string;
    }
  >;
}
