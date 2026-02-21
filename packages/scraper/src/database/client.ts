/**
 * Prisma Client Singleton
 *
 * Provides a singleton PrismaClient instance for database access.
 * Handles connection errors gracefully and provides cleanup functionality.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

// ===============================================================================
// Singleton Instance
// ===============================================================================

let prismaClient: PrismaClient | null = null;
let isConnected = false;
let connectionError: Error | null = null;

// ===============================================================================
// Configuration
// ===============================================================================

interface PrismaClientConfig {
  logQueries?: boolean;
  logErrors?: boolean;
}

const defaultConfig: PrismaClientConfig = {
  logQueries: process.env.NODE_ENV === 'development',
  logErrors: true,
};

// ===============================================================================
// Client Creation & Connection
// ===============================================================================

/**
 * Get or create the Prisma client singleton
 */
export function getPrismaClient(config?: PrismaClientConfig): PrismaClient | null {
  if (prismaClient) {
    return prismaClient;
  }

  const mergedConfig = { ...defaultConfig, ...config };

  try {
    prismaClient = new PrismaClient({
      log: [
        ...(mergedConfig.logQueries ? [{ emit: 'event' as const, level: 'query' as const }] : []),
        ...(mergedConfig.logErrors ? [{ emit: 'event' as const, level: 'error' as const }] : []),
        { emit: 'event' as const, level: 'warn' as const },
      ],
    });

    // Set up query logging
    if (mergedConfig.logQueries) {
      prismaClient.$on('query' as never, (e: { query: string; duration: number }) => {
        logger.debug('Prisma Query', { query: e.query, duration: `${e.duration}ms` });
      });
    }

    // Set up error logging
    if (mergedConfig.logErrors) {
      prismaClient.$on('error' as never, (e: { message: string }) => {
        logger.error('Prisma Error', { message: e.message });
      });
    }

    // Set up warning logging
    prismaClient.$on('warn' as never, (e: { message: string }) => {
      logger.warn('Prisma Warning', { message: e.message });
    });

    logger.info('Prisma client created');
    return prismaClient;
  } catch (error) {
    connectionError = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to create Prisma client', { error: connectionError.message });
    return null;
  }
}

/**
 * Connect to the database
 */
export async function connectPrisma(): Promise<boolean> {
  const client = getPrismaClient();

  if (!client) {
    logger.error('Cannot connect: Prisma client not initialized');
    return false;
  }

  if (isConnected) {
    return true;
  }

  try {
    await client.$connect();
    isConnected = true;
    connectionError = null;
    logger.info('Prisma connected to database');
    return true;
  } catch (error) {
    connectionError = error instanceof Error ? error : new Error(String(error));
    isConnected = false;
    logger.error('Failed to connect Prisma to database', { error: connectionError.message });
    return false;
  }
}

/**
 * Disconnect from the database
 */
export async function disconnectPrisma(): Promise<void> {
  if (!prismaClient) {
    return;
  }

  try {
    await prismaClient.$disconnect();
    isConnected = false;
    logger.info('Prisma disconnected from database');
  } catch (error) {
    logger.error('Error disconnecting Prisma', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// ===============================================================================
// Status & Health Check
// ===============================================================================

/**
 * Check if Prisma is connected
 */
export function isPrismaConnected(): boolean {
  return isConnected;
}

/**
 * Get the last connection error
 */
export function getPrismaConnectionError(): Error | null {
  return connectionError;
}

/**
 * Health check for database connection
 */
export async function checkPrismaHealth(): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
}> {
  if (!prismaClient) {
    return { connected: false, error: 'Client not initialized' };
  }

  const startTime = Date.now();

  try {
    // Simple query to check connection
    await prismaClient.$queryRaw`SELECT 1`;
    return {
      connected: true,
      latency: Date.now() - startTime,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ===============================================================================
// Exports
// ===============================================================================

/**
 * The Prisma client instance (may be null if not initialized)
 */
export const prisma = getPrismaClient();

export default prisma;
