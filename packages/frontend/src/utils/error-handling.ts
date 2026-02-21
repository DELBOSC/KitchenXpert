/**
 * Centralized error extraction utility.
 *
 * Extracts a human-readable message from an unknown caught value,
 * handling the most common shapes (Error instances, plain strings,
 * API response objects with `error.message`, `message`, or `detail`).
 */
export function getErrorMessage(err: unknown, defaultMessage: string = 'An error occurred'): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof (obj as any).error?.message === 'string') return (obj as any).error.message;
    if (typeof obj.message === 'string') return obj.message as string;
    if (typeof obj.detail === 'string') return obj.detail as string;
  }
  return defaultMessage;
}
