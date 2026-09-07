/**
 * Expression indexes on seeded hot keys (ADR-0002).
 *
 * `jsonb ->>` is immutable, so expressions on it index cleanly. The query compiler must
 * emit exactly these expressions for filters/sorts to hit the index:
 *   - text attributes:  lower(data->>'key')
 *   - number attributes: (data->>'key')::numeric
 *   - select/date:       data->>'key'
 *
 * `id` is appended as the final column so keyset pagination (sort tuple + id tiebreaker)
 * is fully index-covered. A GIN index on `data` backs ad-hoc containment filters on
 * keys that don't have a dedicated expression index.
 */
const INDEXES = [
  ['idx_records_name', `CREATE INDEX idx_records_name ON records (object_id, lower(data->>'name'), id)`],
  ['idx_records_stage', `CREATE INDEX idx_records_stage ON records (object_id, (data->>'stage'), id)`],
  ['idx_records_value', `CREATE INDEX idx_records_value ON records (object_id, ((data->>'value')::numeric), id)`],
  ['idx_records_owner', `CREATE INDEX idx_records_owner ON records (object_id, (data->>'owner'), id)`],
  ['idx_records_created', `CREATE INDEX idx_records_created ON records (object_id, (data->>'created'), id)`],
  ['idx_records_last_activity', `CREATE INDEX idx_records_last_activity ON records (object_id, (data->>'last_activity'), id)`],
];

export const up = (pgm) => {
  for (const [name, sql] of INDEXES) {
    pgm.sql(sql);
  }
  pgm.sql('CREATE INDEX idx_records_data_gin ON records USING gin (data)');
};

export const down = (pgm) => {
  for (const [name] of INDEXES) {
    pgm.sql(`DROP INDEX IF EXISTS ${name}`);
  }
  pgm.sql('DROP INDEX IF EXISTS idx_records_data_gin');
};
