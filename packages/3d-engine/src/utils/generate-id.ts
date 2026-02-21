/**
 * Generate a unique ID suitable for browser environments.
 * Uses crypto.randomUUID() when available, falls back to timestamp + random.
 */
export function generateId(prefix?: string): string {
  let unique: string;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    unique = crypto.randomUUID();
  } else {
    unique = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
  return prefix ? `${prefix}_${unique}` : unique;
}
