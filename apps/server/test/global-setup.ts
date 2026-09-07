import { checkDatabase, closePool } from '../src/db.js';
import { seedAll } from '../src/seed/seed.js';

/**
 * Self-provisioning test database: migrate (idempotent) + small deterministic seed.
 * When no database is reachable, tests that need one skip themselves — each test file
 * probes with checkDatabase() because globalSetup runs in its own process.
 */
export async function setup(): Promise<void> {
  if (!(await checkDatabase())) {
    console.log('[global-setup] no database reachable — DB-backed tests will skip');
    return;
  }
  const { runner } = await import('node-pg-migrate');
  await runner({
    databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/tabella',
    dir: new URL('../migrations', import.meta.url).pathname,
    direction: 'up',
    // v9 has no default for this — without it the history lookup misses pgmigrations.
    migrationsTable: 'pgmigrations',
    log: () => {},
  });
  await seedAll({ companies: 60, people: 60, deals: 30 });
  console.log('[global-setup] migrated + seeded small fixture set');
  await closePool();
}
