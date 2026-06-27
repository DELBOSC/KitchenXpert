/**
 * Logging Utilities
 * Provides utility functions for logging with different levels and formatting.
 */

/**
 * Log levels.
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
  SILENT = 6,
}

/**
 * Log level names.
 */
export const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
  [LogLevel.SILENT]: 'SILENT',
};

/**
 * Log level colors for console output.
 */
export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.TRACE]: '\x1b[90m', // Gray
  [LogLevel.DEBUG]: '\x1b[36m', // Cyan
  [LogLevel.INFO]: '\x1b[32m', // Green
  [LogLevel.WARN]: '\x1b[33m', // Yellow
  [LogLevel.ERROR]: '\x1b[31m', // Red
  [LogLevel.FATAL]: '\x1b[35m', // Magenta
  [LogLevel.SILENT]: '',
};

/**
 * Reset color code.
 */
const RESET_COLOR = '\x1b[0m';

/**
 * Logger configuration options.
 */
export interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  timestamps?: boolean;
  colors?: boolean;
  handler?: (level: LogLevel, message: string, ...args: unknown[]) => void;
}

/**
 * Default logger configuration.
 */
const defaultConfig: LoggerConfig = {
  level: LogLevel.INFO,
  prefix: '',
  timestamps: true,
  colors: true,
};

/**
 * Current logger configuration.
 */
let currentConfig: LoggerConfig = { ...defaultConfig };

/**
 * Configures the logger.
 * @param config - The configuration options
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Gets the current logger configuration.
 * @returns The current configuration
 */
export function getLoggerConfig(): LoggerConfig {
  return { ...currentConfig };
}

/**
 * Resets the logger configuration to defaults.
 */
export function resetLoggerConfig(): void {
  currentConfig = { ...defaultConfig };
}

/**
 * Formats a log message.
 * @param level - The log level
 * @param message - The message
 * @returns The formatted message
 */
function formatMessage(level: LogLevel, message: string): string {
  const parts: string[] = [];

  if (currentConfig.timestamps) {
    parts.push(`[${new Date().toISOString()}]`);
  }

  if (currentConfig.prefix) {
    parts.push(`[${currentConfig.prefix}]`);
  }

  parts.push(`[${LOG_LEVEL_NAMES[level]}]`);
  parts.push(message);

  let formattedMessage = parts.join(' ');

  if (currentConfig.colors && typeof window === 'undefined') {
    formattedMessage = `${LOG_LEVEL_COLORS[level]}${formattedMessage}${RESET_COLOR}`;
  }

  return formattedMessage;
}

/**
 * Logs a message at the specified level.
 * @param level - The log level
 * @param message - The message
 * @param args - Additional arguments
 */
function log(level: LogLevel, message: string, ...args: unknown[]): void {
  if (level < currentConfig.level) {
    return;
  }

  if (currentConfig.handler) {
    currentConfig.handler(level, message, ...args);
    return;
  }

  const formattedMessage = formatMessage(level, message);

  switch (level) {
    case LogLevel.TRACE:
    case LogLevel.DEBUG:
      console.debug(formattedMessage, ...args);
      break;
    case LogLevel.INFO:
      console.info(formattedMessage, ...args);
      break;
    case LogLevel.WARN:
      console.warn(formattedMessage, ...args);
      break;
    case LogLevel.ERROR:
    case LogLevel.FATAL:
      console.error(formattedMessage, ...args);
      break;
    default:
      console.log(formattedMessage, ...args);
  }
}

/**
 * Logs a trace message.
 * @param message - The message
 * @param args - Additional arguments
 */
export function trace(message: string, ...args: unknown[]): void {
  log(LogLevel.TRACE, message, ...args);
}

/**
 * Logs a debug message.
 * @param message - The message
 * @param args - Additional arguments
 */
export function debug(message: string, ...args: unknown[]): void {
  log(LogLevel.DEBUG, message, ...args);
}

/**
 * Logs an info message.
 * @param message - The message
 * @param args - Additional arguments
 */
export function info(message: string, ...args: unknown[]): void {
  log(LogLevel.INFO, message, ...args);
}

/**
 * Logs a warning message.
 * @param message - The message
 * @param args - Additional arguments
 */
export function warn(message: string, ...args: unknown[]): void {
  log(LogLevel.WARN, message, ...args);
}

/**
 * Logs an error message.
 * @param message - The message
 * @param args - Additional arguments
 */
export function error(message: string, ...args: unknown[]): void {
  log(LogLevel.ERROR, message, ...args);
}

/**
 * Logs a fatal error message.
 * @param message - The message
 * @param args - Additional arguments
 */
export function fatal(message: string, ...args: unknown[]): void {
  log(LogLevel.FATAL, message, ...args);
}

/**
 * Creates a child logger with a specific prefix.
 * @param prefix - The prefix for the child logger
 * @returns A logger object
 */
export function createLogger(prefix: string) {
  const childPrefix = currentConfig.prefix ? `${currentConfig.prefix}:${prefix}` : prefix;

  return {
    trace: (message: string, ...args: unknown[]) => {
      const savedPrefix = currentConfig.prefix;
      currentConfig.prefix = childPrefix;
      trace(message, ...args);
      currentConfig.prefix = savedPrefix;
    },
    debug: (message: string, ...args: unknown[]) => {
      const savedPrefix = currentConfig.prefix;
      currentConfig.prefix = childPrefix;
      debug(message, ...args);
      currentConfig.prefix = savedPrefix;
    },
    info: (message: string, ...args: unknown[]) => {
      const savedPrefix = currentConfig.prefix;
      currentConfig.prefix = childPrefix;
      info(message, ...args);
      currentConfig.prefix = savedPrefix;
    },
    warn: (message: string, ...args: unknown[]) => {
      const savedPrefix = currentConfig.prefix;
      currentConfig.prefix = childPrefix;
      warn(message, ...args);
      currentConfig.prefix = savedPrefix;
    },
    error: (message: string, ...args: unknown[]) => {
      const savedPrefix = currentConfig.prefix;
      currentConfig.prefix = childPrefix;
      error(message, ...args);
      currentConfig.prefix = savedPrefix;
    },
    fatal: (message: string, ...args: unknown[]) => {
      const savedPrefix = currentConfig.prefix;
      currentConfig.prefix = childPrefix;
      fatal(message, ...args);
      currentConfig.prefix = savedPrefix;
    },
  };
}

/**
 * Groups related log messages.
 * @param label - The group label
 * @param fn - The function containing log calls
 */
export function group(label: string, fn: () => void): void {
  console.group(label);
  try {
    fn();
  } finally {
    console.groupEnd();
  }
}

/**
 * Groups related log messages (collapsed by default).
 * @param label - The group label
 * @param fn - The function containing log calls
 */
export function groupCollapsed(label: string, fn: () => void): void {
  console.groupCollapsed(label);
  try {
    fn();
  } finally {
    console.groupEnd();
  }
}

/**
 * Logs a table of data.
 * @param data - The data to display
 * @param columns - Optional column names to display
 */
export function table(data: unknown, columns?: string[]): void {
  if (currentConfig.level > LogLevel.INFO) {
    return;
  }
  console.table(data, columns);
}

/**
 * Logs a message only once (subsequent calls with same message are ignored).
 * @param message - The message
 * @param args - Additional arguments
 */
const loggedOnce = new Set<string>();
export function logOnce(level: LogLevel, message: string, ...args: unknown[]): void {
  if (loggedOnce.has(message)) {
    return;
  }
  loggedOnce.add(message);
  log(level, message, ...args);
}

/**
 * Clears the "logged once" cache.
 */
export function clearLogOnceCache(): void {
  loggedOnce.clear();
}

/**
 * Measures and logs the execution time of a function.
 * @param label - The label for the measurement
 * @param fn - The function to measure
 * @returns The result of the function
 */
export function time<T>(label: string, fn: () => T): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    debug(`${label}: ${duration.toFixed(2)}ms`);
  }
}

/**
 * Measures and logs the execution time of an async function.
 * @param label - The label for the measurement
 * @param fn - The async function to measure
 * @returns A promise that resolves to the result of the function
 */
export async function timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    debug(`${label}: ${duration.toFixed(2)}ms`);
  }
}
