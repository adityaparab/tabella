import { loadConfig } from '../config.js';
import { closePool } from '../db.js';
import { seedAll } from './seed.js';
import { DEFAULT_COUNTS, type SeedCounts } from './generate.js';

/** `pnpm seed [--small]` — Small = 25/25/25 for tests and CI fixtures. */
function parseCounts(args: string[]): SeedCounts {
  if (args.includes('--small')) return { companies: 25, people: 25, deals: 25 };
  const fromEnv = Number(process.env.SEED_COUNT);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return { companies: fromEnv, people: fromEnv, deals: Math.round(fromEnv / 2) };
  }
  return DEFAULT_COUNTS;
}

const counts = parseCounts(process.argv.slice(2));
// Touch config/pool shape explicitly so DATABASE_URL is visibly the one we use.
console.log(`seeding ${JSON.stringify(counts)} -> ${loadConfig().databaseUrl.replace(/:[^:@/]+@/, ':***@')}`);
try {
  const result = await seedAll(counts);
  console.log(`seeded in ${result.durationMs}ms`);
} finally {
  await closePool();
}
