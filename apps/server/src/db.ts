import pg from 'pg';
import { loadConfig } from './config.js';

// node-postgres returns BIGINT (int8) as a string by default. Our timestamps are
// epoch milliseconds, which fit losslessly in a JS number, and the shared zod
// schemas expect numbers — so parse int8 globally for this process.
pg.types.setTypeParser(20, (value: string) => Number(value));

let pool: pg.Pool | undefined;

/** Exactly one pool per process (ADR-0001): Railway connection caps are real. */
export function getPool(): pg.Pool {
  pool ??= new pg.Pool({
    connectionString: loadConfig().databaseUrl,
    max: 10,
  });
  return pool;
}

export async function query<Row extends pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<Row[]> {
  const result = await getPool().query<Row>(text, params);
  return result.rows;
}

export async function checkDatabase(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
