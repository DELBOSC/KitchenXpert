import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

/**
 * Prisma Client Singleton
 *
 * This module provides a singleton instance of the Prisma Client to ensure
 * that only one connection pool is created during the application lifecycle.
 *
 * In development, we attach the client to the global object to prevent
 * multiple instances during hot-reloading.
 */

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  });
};

/**
 * The Prisma Client instance
 *
 * In development, we reuse the existing instance if available to prevent
 * exhausting the database connection pool during hot-reloading.
 */
export const prisma: PrismaClient =
  globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

/**
 * Connect to the database
 * Call this during application startup
 */
export async function connectPrisma(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('[PRISMA] Connected to database successfully');
  } catch (error) {
    logger.error('[PRISMA] Failed to connect to database:', error);
    throw error;
  }
}

/**
 * Disconnect from the database
 * Call this during graceful shutdown
 */
export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('[PRISMA] Disconnected from database');
  } catch (error) {
    logger.error('[PRISMA] Error disconnecting from database:', error);
    throw error;
  }
}

export default prisma;
