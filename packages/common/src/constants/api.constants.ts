/**
 * API-related constants for KitchenXpert
 */

/** HTTP Methods */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
}

/** HTTP Status Codes */
export enum HttpStatusCode {
  // Success
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,

  // Redirection
  MOVED_PERMANENTLY = 301,
  FOUND = 302,
  NOT_MODIFIED = 304,

  // Client Errors
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,

  // Server Errors
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

/** Common HTTP Headers */
export const HTTP_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  ACCEPT: 'Accept',
  CACHE_CONTROL: 'Cache-Control',
  X_REQUEST_ID: 'X-Request-Id',
  X_API_KEY: 'X-Api-Key',
  X_CORRELATION_ID: 'X-Correlation-Id',
} as const;

/** Content Types */
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  MULTIPART_FORM_DATA: 'multipart/form-data',
  TEXT_PLAIN: 'text/plain',
  TEXT_HTML: 'text/html',
  OCTET_STREAM: 'application/octet-stream',
} as const;

/** API Endpoints */
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    REFRESH_TOKEN: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // Users
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    PREFERENCES: '/users/preferences',
  },

  // Projects
  PROJECTS: {
    BASE: '/projects',
    DESIGNS: '/projects/designs',
    TEMPLATES: '/projects/templates',
  },

  // Products
  PRODUCTS: {
    BASE: '/products',
    CATEGORIES: '/products/categories',
    SEARCH: '/products/search',
    INVENTORY: '/products/inventory',
  },

  // Kitchen Design
  KITCHEN: {
    LAYOUTS: '/kitchen/layouts',
    CABINETS: '/kitchen/cabinets',
    APPLIANCES: '/kitchen/appliances',
    COUNTERTOPS: '/kitchen/countertops',
    RENDER: '/kitchen/render',
  },

  // Orders
  ORDERS: {
    BASE: '/orders',
    QUOTES: '/orders/quotes',
    INVOICE: '/orders/invoice',
  },
} as const;

/** API Versioning */
export const API_VERSION = {
  V1: '/api/v1',
  V2: '/api/v2',
  CURRENT: '/api/v1',
} as const;

/** Request Timeout (in milliseconds) */
export const REQUEST_TIMEOUT = {
  DEFAULT: 30000,
  SHORT: 10000,
  LONG: 60000,
  UPLOAD: 120000,
} as const;

/** Pagination Defaults */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
