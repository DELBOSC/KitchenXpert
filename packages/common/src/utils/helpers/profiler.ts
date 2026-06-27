/**
 * Performance Profiling Utilities
 * Provides utility functions for measuring and analyzing performance.
 */

/**
 * Performance measurement result.
 */
export interface PerformanceMeasurement {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, unknown>;
}

/**
 * Performance statistics.
 */
export interface PerformanceStats {
  name: string;
  count: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  measurements: PerformanceMeasurement[];
}

/**
 * Active timers map.
 */
const activeTimers = new Map<string, { startTime: number; metadata?: Record<string, unknown> }>();

/**
 * Completed measurements.
 */
const measurements: PerformanceMeasurement[] = [];

/**
 * Maximum number of measurements to keep.
 */
let maxMeasurements = 1000;

/**
 * Sets the maximum number of measurements to keep.
 * @param max - The maximum number
 */
export function setMaxMeasurements(max: number): void {
  maxMeasurements = max;
  while (measurements.length > maxMeasurements) {
    measurements.shift();
  }
}

/**
 * Starts a performance timer.
 * @param name - The name of the timer
 * @param metadata - Optional metadata to attach
 * @returns The start time
 */
export function startTimer(name: string, metadata?: Record<string, unknown>): number {
  const startTime = performance.now();
  activeTimers.set(name, { startTime, metadata });
  return startTime;
}

/**
 * Stops a performance timer and records the measurement.
 * @param name - The name of the timer
 * @returns The measurement result or null if timer not found
 */
export function stopTimer(name: string): PerformanceMeasurement | null {
  const timer = activeTimers.get(name);
  if (!timer) {
    console.warn(`Timer "${name}" not found`);
    return null;
  }

  const endTime = performance.now();
  const measurement: PerformanceMeasurement = {
    name,
    startTime: timer.startTime,
    endTime,
    duration: endTime - timer.startTime,
    metadata: timer.metadata,
  };

  activeTimers.delete(name);
  addMeasurement(measurement);

  return measurement;
}

/**
 * Adds a measurement to the collection.
 * @param measurement - The measurement to add
 */
function addMeasurement(measurement: PerformanceMeasurement): void {
  measurements.push(measurement);
  while (measurements.length > maxMeasurements) {
    measurements.shift();
  }
}

/**
 * Measures the execution time of a synchronous function.
 * @param name - The name of the measurement
 * @param fn - The function to measure
 * @param metadata - Optional metadata
 * @returns The result of the function
 */
export function measure<T>(name: string, fn: () => T, metadata?: Record<string, unknown>): T {
  const startTime = performance.now();
  try {
    return fn();
  } finally {
    const endTime = performance.now();
    addMeasurement({
      name,
      startTime,
      endTime,
      duration: endTime - startTime,
      metadata,
    });
  }
}

/**
 * Measures the execution time of an asynchronous function.
 * @param name - The name of the measurement
 * @param fn - The async function to measure
 * @param metadata - Optional metadata
 * @returns A promise that resolves to the result of the function
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const startTime = performance.now();
  try {
    return await fn();
  } finally {
    const endTime = performance.now();
    addMeasurement({
      name,
      startTime,
      endTime,
      duration: endTime - startTime,
      metadata,
    });
  }
}

/**
 * Creates a decorator for measuring method execution time.
 * @param name - The name prefix for measurements
 * @returns A decorator function
 */
export function measureDecorator(name?: string) {
  return function <T extends (...args: unknown[]) => unknown>(
    _target: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value;
    if (!originalMethod) return descriptor;

    const measurementName = name ?? propertyKey;

    descriptor.value = function (this: unknown, ...args: unknown[]) {
      return measure(measurementName, () => originalMethod.apply(this, args));
    } as T;

    return descriptor;
  };
}

/**
 * Gets all measurements.
 * @returns An array of all measurements
 */
export function getMeasurements(): PerformanceMeasurement[] {
  return [...measurements];
}

/**
 * Gets measurements by name.
 * @param name - The name to filter by
 * @returns An array of matching measurements
 */
export function getMeasurementsByName(name: string): PerformanceMeasurement[] {
  return measurements.filter((m) => m.name === name);
}

/**
 * Clears all measurements.
 */
export function clearMeasurements(): void {
  measurements.length = 0;
}

/**
 * Gets statistics for measurements with a specific name.
 * @param name - The name to get statistics for
 * @returns The performance statistics
 */
export function getStats(name: string): PerformanceStats | null {
  const namedMeasurements = getMeasurementsByName(name);
  if (namedMeasurements.length === 0) {
    return null;
  }

  const durations = namedMeasurements.map((m) => m.duration);
  const totalTime = durations.reduce((sum, d) => sum + d, 0);

  return {
    name,
    count: namedMeasurements.length,
    totalTime,
    averageTime: totalTime / namedMeasurements.length,
    minTime: Math.min(...durations),
    maxTime: Math.max(...durations),
    measurements: namedMeasurements,
  };
}

/**
 * Gets all statistics grouped by name.
 * @returns A map of name to statistics
 */
export function getAllStats(): Map<string, PerformanceStats> {
  const statsMap = new Map<string, PerformanceStats>();
  const names = new Set(measurements.map((m) => m.name));

  for (const name of names) {
    const stats = getStats(name);
    if (stats) {
      statsMap.set(name, stats);
    }
  }

  return statsMap;
}

/**
 * Prints a performance report to the console.
 */
export function printReport(): void {
  const allStats = getAllStats();
  console.log('\n=== Performance Report ===\n');

  for (const [name, stats] of allStats) {
    console.log(`${name}:`);
    console.log(`  Count: ${stats.count}`);
    console.log(`  Total: ${stats.totalTime.toFixed(2)}ms`);
    console.log(`  Average: ${stats.averageTime.toFixed(2)}ms`);
    console.log(`  Min: ${stats.minTime.toFixed(2)}ms`);
    console.log(`  Max: ${stats.maxTime.toFixed(2)}ms`);
    console.log('');
  }
}

/**
 * Creates a profiler instance for a specific scope.
 * @param scope - The scope name prefix
 * @returns A profiler object
 */
export function createProfiler(scope: string) {
  return {
    start: (name: string, metadata?: Record<string, unknown>) =>
      startTimer(`${scope}:${name}`, metadata),
    stop: (name: string) => stopTimer(`${scope}:${name}`),
    measure: <T>(name: string, fn: () => T, metadata?: Record<string, unknown>) =>
      measure(`${scope}:${name}`, fn, metadata),
    measureAsync: <T>(name: string, fn: () => Promise<T>, metadata?: Record<string, unknown>) =>
      measureAsync(`${scope}:${name}`, fn, metadata),
    getStats: (name: string) => getStats(`${scope}:${name}`),
    getMeasurements: (name?: string) =>
      name
        ? getMeasurementsByName(`${scope}:${name}`)
        : measurements.filter((m) => m.name.startsWith(`${scope}:`)),
  };
}

/**
 * Memory usage information (Node.js only).
 */
export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

/**
 * Gets current memory usage (Node.js only).
 * @returns Memory usage information or null if not available
 */
export function getMemoryUsage(): MemoryUsage | null {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
    };
  }

  // Browser environment - try Performance API
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const memory = (performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } })
      .memory;
    if (memory) {
      return {
        heapUsed: memory.usedJSHeapSize,
        heapTotal: memory.totalJSHeapSize,
        external: 0,
        rss: 0,
      };
    }
  }

  return null;
}

/**
 * Formats bytes to a human-readable string.
 * @param bytes - The number of bytes
 * @returns A formatted string
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Measures memory usage before and after a function execution.
 * @param name - The name of the measurement
 * @param fn - The function to measure
 * @returns The result and memory delta
 */
export function measureMemory<T>(
  name: string,
  fn: () => T
): { result: T; memoryDelta: number | null } {
  const beforeMemory = getMemoryUsage();
  const result = fn();
  const afterMemory = getMemoryUsage();

  let memoryDelta: number | null = null;
  if (beforeMemory && afterMemory) {
    memoryDelta = afterMemory.heapUsed - beforeMemory.heapUsed;
    console.log(
      `[${name}] Memory delta: ${formatBytes(memoryDelta)} (${memoryDelta > 0 ? '+' : ''}${memoryDelta} bytes)`
    );
  }

  return { result, memoryDelta };
}

/**
 * Creates a throttled profiler that only records every Nth call.
 * @param n - Record every Nth call
 * @returns A throttled profiler
 */
export function createThrottledProfiler(n: number) {
  let callCount = 0;

  return {
    measure: <T>(name: string, fn: () => T): T => {
      callCount++;
      if (callCount % n === 0) {
        return measure(name, fn);
      }
      return fn();
    },
    measureAsync: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
      callCount++;
      if (callCount % n === 0) {
        return measureAsync(name, fn);
      }
      return fn();
    },
    reset: () => {
      callCount = 0;
    },
  };
}
