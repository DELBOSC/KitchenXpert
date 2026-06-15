/**
 * @kitchenxpert/common
 * Shared types, utilities, and constants for KitchenXpert
 */

// Export all types (primary source of type definitions)
export * from './types';

// Export errors (specific exports to avoid conflict with ValidationError from utils)
export {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
  ServiceUnavailableError,
  NotFoundError,
  AuthorizationError,
  RateLimitError,
  PermissionError,
  MonitoringError,
  WebhookError,
} from './errors';
export type { ValidationErrorDetail } from './errors';
// Also export ValidationError from errors with an alias
export { ValidationError as ApiValidationError } from './errors';

// Export utilities (formatting, validation, helpers)
export * from './utils';

// Re-export constants as a namespace to avoid conflicts with types
export * as Constants from './constants';

// Re-export interfaces
export * from './interfaces';

// Re-export models as a namespace to avoid conflicts
export * as Models from './models';

// Re-export i18n as a namespace to avoid conflicts with utils formatting
export * as i18n from './i18n';

// Catalog ingestion contracts (§15.8) — unified product schema + Strategy
// interface, single source of truth shared by the scraper (producer) and the
// backend (consumer, roadmap step d). No name collisions with the exports
// above (audited 15/06).
export * from './catalog';
