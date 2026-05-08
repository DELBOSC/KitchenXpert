/**
 * Seed Entry Point
 * Runs all database seeds in order
 */

import path from 'path';

import dotenv from 'dotenv';

// Load .env from monorepo root (CWD may be packages/backend/)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '..', '.env') });

import { getConnection, closeDatabase } from './connection';
import { createSeedRunner, allSeeds } from './seeds';

async function main(): Promise<void> {
  console.log('[Seed] Starting database seeding...\n');

  const connection = await getConnection();
  const runner = createSeedRunner(connection);

  runner.registerAll(allSeeds);

  const result = await runner.seed();

  if (result.status === 'up_to_date') {
    console.log('\n[Seed] Database is already up to date.');
  } else {
    console.log(`\n[Seed] Successfully executed ${result.executed.length} seed(s):`);
    result.executed.forEach(id => console.log(`  - ${id}`));
  }

  await closeDatabase();
  process.exit(0);
}

main().catch((error) => {
  console.error('[Seed] Failed:', error);
  process.exit(1);
});
