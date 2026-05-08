/**
 * Seed Runner
 * Handles database seeding for development and testing
 */

import logger from '../../utils/logger';

import type { Connection, Transaction } from '../connection';

// Re-export Transaction for seeds to use
export type { Transaction } from '../connection';

export interface Seed {
  id: string;
  name: string;
  order: number;
  run(tx: Transaction): Promise<void>;
  cleanup?(tx: Transaction): Promise<void>;
}

export interface SeedOptions {
  tableName?: string;
  truncateFirst?: boolean;
  runCleanup?: boolean;
}

const defaultOptions: SeedOptions = {
  tableName: '_seeds',
  truncateFirst: false,
  runCleanup: false,
};

export class SeedRunner {
  private seeds: Seed[] = [];
  private options: SeedOptions;

  constructor(
    private connection: Connection,
    options: SeedOptions = {}
  ) {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Register a seed
   */
  register(seed: Seed): void {
    this.seeds.push(seed);
    this.seeds.sort((a, b) => a.order - b.order);
  }

  /**
   * Register multiple seeds
   */
  registerAll(seeds: Seed[]): void {
    seeds.forEach(s => this.register(s));
  }

  /**
   * Run all seeds
   */
  async seed(): Promise<SeedResult> {
    await this.ensureSeedTable();

    const executed = await this.getExecutedSeeds();
    const executedIds = new Set(executed);

    const pending = this.seeds.filter(s => !executedIds.has(s.id));

    if (pending.length === 0) {
      logger.info('[Seed] No pending seeds');
      return { executed: [], status: 'up_to_date' };
    }

    const executedSeeds: string[] = [];

    logger.info(`[Seed] Running ${pending.length} seed(s)...`);

    for (const seed of pending) {
      try {
        logger.info(`[Seed] Running: ${seed.name}...`);

        await this.connection.transaction(async (tx) => {
          await seed.run(tx);
          await this.recordSeed(tx, seed);
        });

        executedSeeds.push(seed.id);
        logger.info(`[Seed] Completed: ${seed.name}`);
      } catch (error) {
        logger.error(`[Seed] Failed: ${seed.name}`, error);
        throw new SeedError(
          'SEED_FAILED',
          `Seed ${seed.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    logger.info(`[Seed] Successfully ran ${executedSeeds.length} seed(s)`);

    return {
      executed: executedSeeds,
      status: 'seeded',
    };
  }

  /**
   * Run a specific seed
   */
  async runSeed(seedId: string): Promise<void> {
    const seed = this.seeds.find(s => s.id === seedId);
    if (!seed) {
      throw new SeedError('SEED_NOT_FOUND', `Seed ${seedId} not found`);
    }

    await this.connection.transaction(async (tx) => {
      await seed.run(tx);
    });
  }

  /**
   * Cleanup all seeds (reverse order)
   */
  async cleanup(): Promise<SeedResult> {
    const executed = await this.getExecutedSeeds();
    const toCleanup = this.seeds
      .filter(s => executed.includes(s.id) && s.cleanup)
      .reverse();

    if (toCleanup.length === 0) {
      logger.info('[Seed] No seeds to cleanup');
      return { executed: [], status: 'up_to_date' };
    }

    const cleanedUp: string[] = [];

    logger.info(`[Seed] Cleaning up ${toCleanup.length} seed(s)...`);

    for (const seed of toCleanup) {
      try {
        logger.info(`[Seed] Cleaning up: ${seed.name}...`);

        await this.connection.transaction(async (tx) => {
          if (seed.cleanup) {
            await seed.cleanup(tx);
          }
          await this.removeSeedRecord(tx, seed.id);
        });

        cleanedUp.push(seed.id);
        logger.info(`[Seed] Cleaned up: ${seed.name}`);
      } catch (error) {
        logger.error(`[Seed] Cleanup failed: ${seed.name}`, error);
        throw new SeedError(
          'CLEANUP_FAILED',
          `Cleanup of ${seed.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return {
      executed: cleanedUp,
      status: 'cleaned',
    };
  }

  /**
   * Reset and re-run all seeds
   */
  async refresh(): Promise<SeedResult> {
    await this.cleanup();
    return this.seed();
  }

  /**
   * Get seed status
   */
  async status(): Promise<SeedStatus> {
    await this.ensureSeedTable();

    const executed = await this.getExecutedSeeds();
    const executedSet = new Set(executed);
    const pending = this.seeds.filter(s => !executedSet.has(s.id));

    return {
      total: this.seeds.length,
      executed: executed.length,
      pending: pending.length,
      seeds: this.seeds.map(s => ({
        id: s.id,
        name: s.name,
        order: s.order,
        executed: executedSet.has(s.id),
      })),
    };
  }

  // Private methods

  private async ensureSeedTable(): Promise<void> {
    await this.connection.execute(`
      CREATE TABLE IF NOT EXISTS ${this.options.tableName} (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async getExecutedSeeds(): Promise<string[]> {
    const result = await this.connection.query<{ id: string }>(
      `SELECT id FROM ${this.options.tableName} ORDER BY executed_at ASC`
    );
    return result.rows.map(r => r.id);
  }

  private async recordSeed(tx: Transaction, seed: Seed): Promise<void> {
    await tx.execute(
      `INSERT INTO ${this.options.tableName} (id, name) VALUES ($1, $2)`,
      [seed.id, seed.name]
    );
  }

  private async removeSeedRecord(tx: Transaction, seedId: string): Promise<void> {
    await tx.execute(
      `DELETE FROM ${this.options.tableName} WHERE id = $1`,
      [seedId]
    );
  }
}

export interface SeedResult {
  executed: string[];
  status: 'seeded' | 'cleaned' | 'up_to_date';
}

export interface SeedStatus {
  total: number;
  executed: number;
  pending: number;
  seeds: Array<{
    id: string;
    name: string;
    order: number;
    executed: boolean;
  }>;
}

export class SeedError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'SeedError';
  }
}

export function createSeedRunner(
  connection: Connection,
  options?: SeedOptions
): SeedRunner {
  return new SeedRunner(connection, options);
}

export default SeedRunner;
