import { randomBytes } from 'node:crypto';
import type {
  Attribute,
  FieldValue,
  ListRecordsQuery,
  ListRecordsResponse,
  TabellaRecord,
} from '@tabella/shared';
import { getPool, query } from '../db.js';
import { attrsToMap, compilePageQuery, encodeCursor } from '../query/engine.js';

interface RecordRow {
  id: string;
  object_id: string;
  data: Record<string, FieldValue>;
  version: number;
  created_at: number;
  updated_at: number;
}

interface CountRow {
  total: number;
}

function toRecord(row: RecordRow): TabellaRecord {
  return {
    id: row.id,
    objectId: row.object_id,
    data: row.data,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class RecordNotFound extends Error {
  constructor(id: string) {
    super(`Record ${id} not found`);
    this.name = 'RecordNotFound';
  }
}

export async function listRecords(
  objectId: string,
  attributes: Attribute[],
  listQuery: ListRecordsQuery,
): Promise<ListRecordsResponse> {
  const compiled = compilePageQuery(listQuery, attrsToMap(attributes), objectId);
  const pool = getPool();

  const [rows, counts] = await Promise.all([
    pool.query(compiled.dataSql, compiled.params),
    pool.query<CountRow>(compiled.countSql, compiled.countParams),
  ]);

  const hasMore = rows.rows.length > compiled.limit;
  const page = (rows.rows as unknown as (RecordRow & Record<string, unknown>)[]).slice(0, compiled.limit);
  const lastRow = page[page.length - 1];

  let nextCursor: string | null = null;
  if (hasMore && lastRow) {
    const values = compiled.sorts.map((_, i) => {
      const value = lastRow[`s${i}`];
      return typeof value === 'object' && value !== null ? String(value) : value;
    }) as (string | number | boolean | null)[];
    nextCursor = encodeCursor(values, lastRow.id);
  }

  return {
    records: page.map(toRecord),
    nextCursor,
    total: counts.rows[0]?.total ?? 0,
  };
}

export async function getRecord(id: string): Promise<TabellaRecord> {
  const rows = await query<RecordRow>(
    'SELECT id, object_id, data, version, created_at, updated_at FROM records WHERE id = $1',
    [id],
  );
  const row = rows[0];
  if (!row) throw new RecordNotFound(id);
  return toRecord(row);
}

export async function createRecord(
  objectId: string,
  data: Record<string, FieldValue>,
): Promise<TabellaRecord> {
  const now = Date.now();
  const id = `rec_${randomBytes(8).toString('base64url')}`;
  const rows = await query<RecordRow>(
    `INSERT INTO records (id, object_id, data, version, created_at, updated_at)
     VALUES ($1, $2, $3::jsonb, 1, $4, $4)
     RETURNING id, object_id, data, version, created_at, updated_at`,
    [id, objectId, JSON.stringify(data), now],
  );
  return toRecord(rows[0]!);
}

/**
 * Field-level patch: shallow JSONB merge (||) of only the provided keys, null clears a
 * field, version bumps monotonically — the basis for field-level LWW (Cycle 6).
 */
export async function patchRecord(
  id: string,
  patch: Record<string, FieldValue>,
): Promise<TabellaRecord> {
  const rows = await query<RecordRow>(
    `UPDATE records
     SET data = data || $2::jsonb, version = version + 1, updated_at = $3
     WHERE id = $1
     RETURNING id, object_id, data, version, created_at, updated_at`,
    [id, JSON.stringify(patch), Date.now()],
  );
  const row = rows[0];
  if (!row) throw new RecordNotFound(id);
  return toRecord(row);
}

export async function deleteRecord(id: string): Promise<void> {
  const result = await getPool().query('DELETE FROM records WHERE id = $1', [id]);
  if (result.rowCount === 0) throw new RecordNotFound(id);
}
