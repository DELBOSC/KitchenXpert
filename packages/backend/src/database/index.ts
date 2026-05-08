/**
 * Database Module Index
 * Export database utilities, migrations, and seeds.
 *
 * The migration / seed sub-barrels already re-export their types
 * (`Migration`, `Seed`, `Transaction`, …), so listing them again here
 * triggers `import/export` "Multiple exports of name X" warnings. We rely
 * on the wildcard re-exports above and keep this file as a thin barrel.
 */

// Connection management — exports `Transaction` (the runtime interface).
// We re-export it explicitly so the `migrations` and `seeds` barrels can
// freely re-export their own type aliases without colliding.
export {
  type QueryResult,
  type Connection,
  type Transaction,
  createConnection,
  connectDatabase,
} from './connection';

// Migrations — re-export everything except the duplicated `Transaction`
// type alias which already comes from ./connection above.
export {
  MigrationRunner,
  createMigrationRunner,
  allMigrations,
  type Migration,
  type MigrationResult,
  type MigrationStatus,
} from './migrations';

// Seeds
export * from './seeds';
