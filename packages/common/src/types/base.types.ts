/**
 * Types de base partagés à travers toute l'application
 */

export type ID = string;
export type Timestamp = Date | string;
export type UUID = string;

export interface BaseEntity {
  id: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp | null;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  message?: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export type Status = 'active' | 'inactive' | 'pending' | 'archived';

export interface Metadata {
  [key: string]: string | number | boolean | null | undefined;
}
