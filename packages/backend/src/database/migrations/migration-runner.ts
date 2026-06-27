/**
 * Migration Runner
 * Handles database schema migrations
 */

import logger from '../../utils/logger';

import type { Connection, Transaction } from '../connection';

// Re-export Transaction for migrations to use
export type { Transaction } from '../connection';

export interface Migration {
  id: string;
  name: string;
  timestamp: number;
  up(tx: Transaction): Promise<void>;
  down(tx: Transaction): Promise<void>;
}

export interface MigrationRecord {
  id: string;
  name: string;
  executedAt: Date;
  batchNumber: number;
}

export interface MigrationOptions {
  tableName?: string;
  direction?: 'up' | 'down';
  targetMigration?: string;
  step?: number;
}

const defaultOptions: MigrationOptions = {
  tableName: '_migrations',
  direction: 'up',
};

export class MigrationRunner {
  private migrations: Migration[] = [];
  private options: MigrationOptions;

  constructor(
    private connection: Connection,
    options: MigrationOptions = {}
  ) {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Register a migration
   */
  register(migration: Migration): void {
    this.migrations.push(migration);
    // Sort migrations by timestamp
    this.migrations.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Register multiple migrations
   */
  registerAll(migrations: Migration[]): void {
    migrations.forEach((m) => this.register(m));
  }

  /**
   * Run pending migrations
   */
  async migrate(): Promise<MigrationResult> {
    await this.ensureMigrationTable();

    const executed = await this.getExecutedMigrations();
    const executedIds = new Set(executed.map((m) => m.id));

    const pending = this.migrations.filter((m) => !executedIds.has(m.id));

    if (pending.length === 0) {
      logger.info('[Migration] No pending migrations');
      return { executed: [], rolled_back: [], status: 'up_to_date' };
    }

    const batchNumber = await this.getNextBatchNumber();
    const executedMigrations: string[] = [];

    logger.info(`[Migration] Running ${pending.length} pending migration(s)...`);

    for (const migration of pending) {
      try {
        logger.info(`[Migration] Running: ${migration.name}...`);

        await this.connection.transaction(async (tx) => {
          await migration.up(tx);
          await this.recordMigration(tx, migration, batchNumber);
        });

        executedMigrations.push(migration.id);
        logger.info(`[Migration] Completed: ${migration.name}`);
      } catch (error) {
        logger.error(`[Migration] Failed: ${migration.name}`, error);
        throw new MigrationError(
          'MIGRATION_FAILED',
          `Migration ${migration.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    logger.info(`[Migration] Successfully ran ${executedMigrations.length} migration(s)`);

    return {
      executed: executedMigrations,
      rolled_back: [],
      status: 'migrated',
    };
  }

  /**
   * Rollback migrations
   */
  async rollback(options?: { step?: number; batch?: number }): Promise<MigrationResult> {
    await this.ensureMigrationTable();

    const executed = await this.getExecutedMigrations();

    if (executed.length === 0) {
      logger.info('[Migration] No migrations to rollback');
      return { executed: [], rolled_back: [], status: 'up_to_date' };
    }

    let toRollback: MigrationRecord[];

    if (options?.batch !== undefined) {
      toRollback = executed.filter((m) => m.batchNumber === options.batch);
    } else if (options?.step !== undefined) {
      toRollback = executed.slice(-options.step);
    } else {
      // Default: rollback last batch
      const lastBatch = Math.max(...executed.map((m) => m.batchNumber));
      toRollback = executed.filter((m) => m.batchNumber === lastBatch);
    }

    if (toRollback.length === 0) {
      logger.info('[Migration] No migrations to rollback');
      return { executed: [], rolled_back: [], status: 'up_to_date' };
    }

    // Rollback in reverse order
    toRollback.reverse();

    const rolledBack: string[] = [];

    logger.info(`[Migration] Rolling back ${toRollback.length} migration(s)...`);

    for (const record of toRollback) {
      const migration = this.migrations.find((m) => m.id === record.id);

      if (!migration) {
        logger.warn(`[Migration] Migration ${record.id} not found, skipping rollback`);
        continue;
      }

      try {
        logger.info(`[Migration] Rolling back: ${migration.name}...`);

        await this.connection.transaction(async (tx) => {
          await migration.down(tx);
          await this.removeMigrationRecord(tx, migration.id);
        });

        rolledBack.push(migration.id);
        logger.info(`[Migration] Rolled back: ${migration.name}`);
      } catch (error) {
        logger.error(`[Migration] Rollback failed: ${migration.name}`, error);
        throw new MigrationError(
          'ROLLBACK_FAILED',
          `Rollback of ${migration.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    logger.info(`[Migration] Successfully rolled back ${rolledBack.length} migration(s)`);

    return {
      executed: [],
      rolled_back: rolledBack,
      status: 'rolled_back',
    };
  }

  /**
   * Reset all migrations
   */
  async reset(): Promise<MigrationResult> {
    const executed = await this.getExecutedMigrations();

    if (executed.length === 0) {
      return { executed: [], rolled_back: [], status: 'up_to_date' };
    }

    // Rollback all
    return this.rollback({ step: executed.length });
  }

  /**
   * Reset and re-run all migrations
   */
  async refresh(): Promise<MigrationResult> {
    await this.reset();
    return this.migrate();
  }

  /**
   * Get migration status
   */
  async status(): Promise<MigrationStatus> {
    await this.ensureMigrationTable();

    const executed = await this.getExecutedMigrations();
    const executedIds = new Set(executed.map((m) => m.id));

    const pending = this.migrations.filter((m) => !executedIds.has(m.id));

    return {
      total: this.migrations.length,
      executed: executed.length,
      pending: pending.length,
      lastExecuted: executed[executed.length - 1],
      pendingMigrations: pending.map((m) => ({ id: m.id, name: m.name })),
      executedMigrations: executed.map((m) => ({
        id: m.id,
        name: m.name,
        executedAt: m.executedAt,
        batchNumber: m.batchNumber,
      })),
    };
  }

  // Private methods

  private async ensureMigrationTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.options.tableName} (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        batch_number INTEGER NOT NULL
      )
    `;

    await this.connection.execute(sql);
  }

  private async getExecutedMigrations(): Promise<MigrationRecord[]> {
    const result = await this.connection.query<{
      id: string;
      name: string;
      executed_at: Date;
      batch_number: number;
    }>(`SELECT * FROM ${this.options.tableName} ORDER BY executed_at ASC`);

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      executedAt: row.executed_at,
      batchNumber: row.batch_number,
    }));
  }

  private async getNextBatchNumber(): Promise<number> {
    const result = await this.connection.query<{ max_batch: number }>(
      `SELECT COALESCE(MAX(batch_number), 0) as max_batch FROM ${this.options.tableName}`
    );

    return (result.rows[0]?.max_batch || 0) + 1;
  }

  private async recordMigration(
    tx: Transaction,
    migration: Migration,
    batchNumber: number
  ): Promise<void> {
    await tx.execute(
      `INSERT INTO ${this.options.tableName} (id, name, batch_number) VALUES ($1, $2, $3)`,
      [migration.id, migration.name, batchNumber]
    );
  }

  private async removeMigrationRecord(tx: Transaction, migrationId: string): Promise<void> {
    await tx.execute(`DELETE FROM ${this.options.tableName} WHERE id = $1`, [migrationId]);
  }
}

export interface MigrationResult {
  executed: string[];
  rolled_back: string[];
  status: 'migrated' | 'rolled_back' | 'up_to_date';
}

export interface MigrationStatus {
  total: number;
  executed: number;
  pending: number;
  lastExecuted?: MigrationRecord;
  pendingMigrations: Array<{ id: string; name: string }>;
  executedMigrations: Array<{
    id: string;
    name: string;
    executedAt: Date;
    batchNumber: number;
  }>;
}

export class MigrationError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

export function createMigrationRunner(
  connection: Connection,
  options?: MigrationOptions
): MigrationRunner {
  return new MigrationRunner(connection, options);
}

export default MigrationRunner;
