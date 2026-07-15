
/** Property names that corrupt an object's prototype when written via bracket access. */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
/**
 * Object Transformation Utilities
 * Provides utility functions for transforming objects.
 */

/**
 * Picks specified keys from an object.
 * @param obj - The source object
 * @param keys - The keys to pick
 * @returns A new object with only the specified keys
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omits specified keys from an object.
 * @param obj - The source object
 * @param keys - The keys to omit
 * @returns A new object without the specified keys
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

/**
 * Checks if a value is a plain object.
 * @param value - The value to check
 * @returns True if the value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Deeply merges multiple objects.
 * @param target - The target object
 * @param sources - The source objects to merge
 * @returns The merged object
 */
export function deepMerge<T extends object>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) {
    return target;
  }

  const result = { ...target } as Record<string, unknown>;

  for (const source of sources) {
    if (!isPlainObject(source)) {
      continue;
    }

    for (const key of Object.keys(source)) {
      const sourceValue = (source as Record<string, unknown>)[key];
      const targetValue = result[key];

      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        result[key] = deepMerge(targetValue as object, sourceValue as object);
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue;
      }
    }
  }

  return result as T;
}

/**
 * Creates a deep clone of an object.
 * @param obj - The object to clone
 * @returns A deep clone of the object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as unknown as T;
  }

  if (isPlainObject(obj)) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      result[key] = deepClone((obj as Record<string, unknown>)[key]);
    }
    return result as T;
  }

  return obj;
}

/**
 * Gets a nested value from an object using a path.
 * @param obj - The object to query
 * @param path - The path (e.g., 'a.b.c' or ['a', 'b', 'c'])
 * @param defaultValue - The default value if path doesn't exist
 * @returns The value at the path or the default value
 */
export function get<T = unknown>(
  obj: object,
  path: string | string[],
  defaultValue?: T
): T | undefined {
  const keys = Array.isArray(path) ? path : path.split('.');
  let result: unknown = obj;

  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = (result as Record<string, unknown>)[key];
  }

  return (result === undefined ? defaultValue : result) as T | undefined;
}

/**
 * Sets a nested value in an object using a path.
 * @param obj - The object to modify
 * @param path - The path (e.g., 'a.b.c' or ['a', 'b', 'c'])
 * @param value - The value to set
 * @returns The modified object
 */
export function set<T extends object>(obj: T, path: string | string[], value: unknown): T {
  const keys = Array.isArray(path) ? path : path.split('.');
  const result = deepClone(obj);
  let current: Record<string, unknown> = result as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    // Prototype-pollution guard. Without it, set(obj, '__proto__.x', v) walks INTO
    // Object.prototype: '__proto__' in current is true, isPlainObject(Object.prototype)
    // is true (its own proto is null), so the reset is skipped and the final write lands
    // on Object.prototype — global pollution, proven by runtime. Refuse the dangerous
    // segments; a path that names one simply does nothing.
    if (UNSAFE_KEYS.has(key)) {
      return result;
    }
    if (!(key in current) || !isPlainObject(current[key])) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];
  if (lastKey !== undefined && !UNSAFE_KEYS.has(lastKey)) {
    current[lastKey] = value;
  }
  return result;
}

/**
 * Checks if an object has a nested path.
 * @param obj - The object to check
 * @param path - The path (e.g., 'a.b.c' or ['a', 'b', 'c'])
 * @returns True if the path exists
 */
export function has(obj: object, path: string | string[]): boolean {
  const keys = Array.isArray(path) ? path : path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(current, key)) {
      return false;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return true;
}

/**
 * Flattens a nested object into a single-level object with dot notation keys.
 * @param obj - The object to flatten
 * @param prefix - The prefix for keys (used internally for recursion)
 * @returns The flattened object
 */
export function flattenObject(
  obj: Record<string, unknown>,
  prefix: string = ''
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (isPlainObject(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Unflattens a dot-notation object into a nested object.
 * @param obj - The flattened object
 * @returns The nested object
 */
export function unflattenObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    set(result, key, obj[key]);
  }

  return result;
}

/**
 * Maps object values using a transform function.
 * @param obj - The source object
 * @param fn - The transform function
 * @returns A new object with transformed values
 */
export function mapValues<T, U>(
  obj: Record<string, T>,
  fn: (value: T, key: string) => U
): Record<string, U> {
  const result: Record<string, U> = {};
  for (const key of Object.keys(obj)) {
    result[key] = fn(obj[key]!, key);
  }
  return result;
}

/**
 * Maps object keys using a transform function.
 * @param obj - The source object
 * @param fn - The transform function
 * @returns A new object with transformed keys
 */
export function mapKeys<T>(
  obj: Record<string, T>,
  fn: (key: string, value: T) => string
): Record<string, T> {
  const result: Record<string, T> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key]!;
    result[fn(key, value)] = value;
  }
  return result;
}

/**
 * Filters an object by a predicate function.
 * @param obj - The source object
 * @param predicate - The filter predicate
 * @returns A new object with filtered entries
 */
export function filterObject<T>(
  obj: Record<string, T>,
  predicate: (value: T, key: string) => boolean
): Record<string, T> {
  const result: Record<string, T> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key]!;
    if (predicate(value, key)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Inverts an object's keys and values.
 * @param obj - The source object
 * @returns A new object with inverted keys and values
 */
export function invert<T extends string | number | symbol>(
  obj: Record<string, T>
): Record<T, string> {
  const result = {} as Record<T, string>;
  for (const key of Object.keys(obj)) {
    result[obj[key]!] = key;
  }
  return result;
}

/**
 * Creates an object from an array of key-value pairs.
 * @param entries - Array of [key, value] pairs
 * @returns An object created from the entries
 */
export function fromEntries<K extends string | number | symbol, V>(
  entries: [K, V][]
): Record<K, V> {
  return Object.fromEntries(entries) as Record<K, V>;
}

/**
 * Checks if two objects are deeply equal.
 * @param obj1 - The first object
 * @param obj2 - The second object
 * @returns True if objects are deeply equal
 */
export function deepEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) {
    return true;
  }

  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
    return false;
  }

  if (obj1 instanceof Date && obj2 instanceof Date) {
    return obj1.getTime() === obj2.getTime();
  }

  if (obj1 instanceof RegExp && obj2 instanceof RegExp) {
    return obj1.toString() === obj2.toString();
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!keys2.includes(key)) {
      return false;
    }
    if (
      !deepEqual((obj1 as Record<string, unknown>)[key], (obj2 as Record<string, unknown>)[key])
    ) {
      return false;
    }
  }

  return true;
}
