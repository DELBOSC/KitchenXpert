/**
 * Array Transformation Utilities
 * Provides utility functions for transforming arrays.
 */

/**
 * Flattens a nested array to a specified depth.
 * @param arr - The array to flatten
 * @param depth - The depth to flatten (default: 1)
 * @returns The flattened array
 */
export function flatten<T>(arr: T[][], depth: number = 1): T[] {
  if (depth < 1) {
    return arr as unknown as T[];
  }
  return arr.reduce<T[]>((acc, val) => {
    if (Array.isArray(val) && depth > 0) {
      acc.push(...flatten(val as unknown as T[][], depth - 1));
    } else {
      acc.push(val as T);
    }
    return acc;
  }, []);
}

/**
 * Deeply flattens a nested array to any depth.
 * @param arr - The array to flatten
 * @returns The completely flattened array
 */
export function flattenDeep<T>(arr: unknown[]): T[] {
  const result: T[] = [];
  const stack = [...arr];

  while (stack.length) {
    const item = stack.pop();
    if (Array.isArray(item)) {
      stack.push(...item);
    } else {
      result.unshift(item as T);
    }
  }

  return result;
}

/**
 * Splits an array into chunks of a specified size.
 * @param arr - The array to chunk
 * @param size - The size of each chunk
 * @returns An array of chunks
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error('Chunk size must be greater than 0');
  }

  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Returns unique values from an array.
 * @param arr - The array to process
 * @returns An array with unique values
 */
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * Returns unique values from an array based on a key function.
 * @param arr - The array to process
 * @param keyFn - A function that returns the key for uniqueness comparison
 * @returns An array with unique values based on the key
 */
export function uniqueBy<T, K>(arr: T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Groups an array by a key function.
 * @param arr - The array to group
 * @param keyFn - A function that returns the group key
 * @returns An object with grouped arrays
 */
export function groupBy<T, K extends string | number | symbol>(
  arr: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

/**
 * Partitions an array into two arrays based on a predicate.
 * @param arr - The array to partition
 * @param predicate - A function that returns true for items in the first group
 * @returns A tuple of two arrays [matches, nonMatches]
 */
export function partition<T>(
  arr: T[],
  predicate: (item: T) => boolean
): [T[], T[]] {
  const matches: T[] = [];
  const nonMatches: T[] = [];

  for (const item of arr) {
    if (predicate(item)) {
      matches.push(item);
    } else {
      nonMatches.push(item);
    }
  }

  return [matches, nonMatches];
}

/**
 * Zips multiple arrays together.
 * @param arrays - The arrays to zip
 * @returns An array of tuples
 */
export function zip<T>(...arrays: T[][]): (T | undefined)[][] {
  const maxLength = Math.max(...arrays.map((arr) => arr.length));
  const result: (T | undefined)[][] = [];

  for (let i = 0; i < maxLength; i++) {
    result.push(arrays.map((arr) => arr[i]));
  }

  return result;
}

/**
 * Removes elements from an array that match the predicate.
 * @param arr - The array to process
 * @param predicate - A function that returns true for items to remove
 * @returns A new array without the removed items
 */
export function without<T>(arr: T[], predicate: (item: T) => boolean): T[] {
  return arr.filter((item) => !predicate(item));
}

/**
 * Returns the intersection of two arrays.
 * @param arr1 - The first array
 * @param arr2 - The second array
 * @returns An array of common elements
 */
export function intersection<T>(arr1: T[], arr2: T[]): T[] {
  const set2 = new Set(arr2);
  return arr1.filter((item) => set2.has(item));
}

/**
 * Returns the difference between two arrays.
 * @param arr1 - The first array
 * @param arr2 - The second array
 * @returns An array of elements in arr1 but not in arr2
 */
export function difference<T>(arr1: T[], arr2: T[]): T[] {
  const set2 = new Set(arr2);
  return arr1.filter((item) => !set2.has(item));
}

/**
 * Shuffles an array randomly using Fisher-Yates algorithm.
 * Uses crypto-safe random integers.
 * @param arr - The array to shuffle
 * @returns A new shuffled array
 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const j = (randomBuffer[0] ?? 0) % (i + 1);
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

/**
 * Creates an array of numbers in a range.
 * @param start - The start of the range
 * @param end - The end of the range (exclusive)
 * @param step - The step between numbers (default: 1)
 * @returns An array of numbers
 */
export function range(start: number, end: number, step: number = 1): number[] {
  if (step === 0) {
    throw new Error('Step cannot be 0');
  }

  const result: number[] = [];
  if (step > 0) {
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
  } else {
    for (let i = start; i > end; i += step) {
      result.push(i);
    }
  }
  return result;
}

/**
 * Returns the first element of an array or undefined.
 * @param arr - The array
 * @returns The first element or undefined
 */
export function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

/**
 * Returns the last element of an array or undefined.
 * @param arr - The array
 * @returns The last element or undefined
 */
export function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

/**
 * Returns a sample of random elements from an array.
 * @param arr - The array to sample from
 * @param count - The number of elements to sample
 * @returns An array of sampled elements
 */
export function sample<T>(arr: T[], count: number): T[] {
  if (count >= arr.length) {
    return shuffle(arr);
  }

  const shuffled = shuffle(arr);
  return shuffled.slice(0, count);
}

/**
 * Compact removes all falsy values from an array.
 * @param arr - The array to compact
 * @returns An array without falsy values
 */
export function compact<T>(arr: (T | null | undefined | false | 0 | '')[]): T[] {
  return arr.filter(Boolean) as T[];
}
