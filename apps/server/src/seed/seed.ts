import { getPool } from '../db.js';
import { CATALOG } from './catalog.js';
import { DEFAULT_COUNTS, generateDataset, type GeneratedRecord, type SeedCounts } from './generate.js';

const BATCH_SIZE = 1_000;

export interface SeedResult {
  counts: SeedCounts;
  durationMs: number;
}

/**
 * Reset the demo dataset: objects/attributes catalog + fresh correlated records.
 * TRUNCATE keeps reseed fast and the demo pristine.
 */
export async function seedAll(counts: SeedCounts = DEFAULT_COUNTS): Promise<SeedResult> {
  const started = Date.now();
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE records, attributes, objects');

    for (const object of CATALOG) {
      await client.query(
        'INSERT INTO objects (id, slug, name, created_at) VALUES ($1, $2, $3, $4)',
        [object.id, object.slug, object.name, object.createdAt],
      );
      for (const attr of object.attributes) {
        await client.query(
          'INSERT INTO attributes (id, object_id, key, label, type, options) VALUES ($1, $2, $3, $4, $5, $6::jsonb)',
          [attr.id, attr.objectId, attr.key, attr.label, attr.type, JSON.stringify(attr.options)],
        );
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const data = generateDataset(counts);
  await insertRecords(data.companies);
  await insertRecords(data.people);
  await insertRecords(data.deals);

  return { counts, durationMs: Date.now() - started };
}

async function insertRecords(records: GeneratedRecord[]): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let offset = 0; offset < records.length; offset += BATCH_SIZE) {
      const batch = records.slice(offset, offset + BATCH_SIZE);
      const values: unknown[] = [];
      const tuples = batch.map((record, i) => {
        const base = i * 5;
        values.push(record.id, record.objectId, JSON.stringify(record.data), record.createdAt, record.updatedAt);
        return `($${base + 1}, $${base + 2}, $${base + 3}::jsonb, $${base + 4}, $${base + 5})`;
      });
      await client.query(
        `INSERT INTO records (id, object_id, data, created_at, updated_at) VALUES ${tuples.join(', ')}`,
        values,
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
