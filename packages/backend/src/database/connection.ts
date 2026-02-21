import { Pool, PoolClient } from 'pg';
import { config } from '../config/app-config';
import logger from '../utils/logger';

let pool: Pool | null = null;

/**
 * Query result interface
 */
export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

/**
 * Transaction interface for migrations and seeds
 */
export interface Transaction {
  execute(sql: string, params?: unknown[]): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
}

/**
 * Connection interface for database operations
 */
export interface Connection {
  execute(sql: string, params?: unknown[]): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}

/**
 * Create a Connection wrapper around the pool
 */
export function createConnection(pgPool: Pool): Connection {
  return {
    async execute(sql: string, params?: unknown[]): Promise<void> {
      await pgPool.query(sql, params);
    },

    async query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
      const result = await pgPool.query(sql, params);
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount ?? 0,
      };
    },

    async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');

        const tx: Transaction = {
          async execute(sql: string, params?: unknown[]): Promise<void> {
            await client.query(sql, params);
          },
          async query<R>(sql: string, params?: unknown[]): Promise<QueryResult<R>> {
            const result = await client.query(sql, params);
            return {
              rows: result.rows as R[],
              rowCount: result.rowCount ?? 0,
            };
          },
        };

        const result = await fn(tx);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

export async function connectDatabase(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl ? {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    logger.info('[DATABASE] Connection test successful');
  } finally {
    client.release();
  }

  pool.on('error', (err) => {
    logger.error('[DATABASE] Unexpected error on idle client', err);
  });

  return pool;
}

/**
 * Get a connection wrapper for the current pool
 */
export async function getConnection(): Promise<Connection> {
  const pgPool = await connectDatabase();
  return createConnection(pgPool);
}

export async function getClient(): Promise<PoolClient> {
  if (!pool) {
    await connectDatabase();
  }
  return pool!.connect();
}

export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  if (!pool) {
    await connectDatabase();
  }
  const result = await pool!.query(text, params);
  return result.rows as T[];
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('[DATABASE] Connection pool closed');
  }
}

export { pool };
export default { connectDatabase, getConnection, getClient, query, closeDatabase };
