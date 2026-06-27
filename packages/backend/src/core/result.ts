/**
 * Result<T, E> — a lightweight Either/Result monad.
 *
 * Rationale
 * ---------
 * Throwing exceptions as a control-flow mechanism hides the failure modes of
 * a function from its type signature. With `Result`, a use-case returns a
 * value that makes success and failure first-class, so controllers can
 * exhaustively switch on the outcome and the compiler enforces it.
 *
 * We keep the API deliberately minimal: no `map` / `chain` helpers until
 * there's a concrete need. The point is clarity, not a full FP library.
 *
 * Usage
 * -----
 *   const r = await registerUser(dto);
 *   if (!r.ok) return res.status(mapErrorToStatus(r.error)).json(r.error);
 *   return res.json(r.value);
 */

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E = DomainError> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

// ---------------------------------------------------------------------------
// Domain errors
// ---------------------------------------------------------------------------

export type DomainErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL';

export interface DomainError {
  readonly code: DomainErrorCode;
  readonly message: string;
  /** Optional field-level hints for VALIDATION_ERROR. */
  readonly issues?: Array<{ path: string; message: string }>;
  /** Optional machine-readable hint (e.g. "EMAIL_ALREADY_REGISTERED"). */
  readonly detail?: string;
  /** Non-serialised cause kept for logs. */
  readonly cause?: unknown;
}

export const DomainErrors = {
  validation(message: string, issues?: DomainError['issues']): DomainError {
    return { code: 'VALIDATION_ERROR', message, issues };
  },
  unauthorized(message = 'Unauthorized'): DomainError {
    return { code: 'UNAUTHORIZED', message };
  },
  forbidden(message = 'Forbidden'): DomainError {
    return { code: 'FORBIDDEN', message };
  },
  notFound(resource: string): DomainError {
    return { code: 'NOT_FOUND', message: `${resource} not found` };
  },
  conflict(message: string, detail?: string): DomainError {
    return { code: 'CONFLICT', message, detail };
  },
  rateLimited(message = 'Too many requests'): DomainError {
    return { code: 'RATE_LIMITED', message };
  },
  upstream(message: string, cause?: unknown): DomainError {
    return { code: 'UPSTREAM_ERROR', message, cause };
  },
  internal(message = 'Internal error', cause?: unknown): DomainError {
    return { code: 'INTERNAL', message, cause };
  },
} as const;

// ---------------------------------------------------------------------------
// HTTP translation
// ---------------------------------------------------------------------------

const STATUS_MAP: Record<DomainErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  INTERNAL: 500,
};

export function errorToStatus(error: DomainError): number {
  return STATUS_MAP[error.code];
}

/**
 * Serialise a DomainError for the HTTP body. Drops non-serialisable fields
 * (`cause`) to avoid leaking internals.
 */
export function errorToBody(error: DomainError): {
  error: {
    code: DomainErrorCode;
    message: string;
    detail?: string;
    issues?: DomainError['issues'];
  };
} {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.detail && { detail: error.detail }),
      ...(error.issues && { issues: error.issues }),
    },
  };
}
