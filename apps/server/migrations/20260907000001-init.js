/**
 * Initial schema (ADR-0001): metadata tables + JSONB record payloads.
 *
 * - objects/attributes are the flexible-schema metadata users define at runtime
 * - records.data holds the payload; hot keys get expression indexes in Cycle 2 (#5)
 * - version drives field-level last-writer-wins merge (Cycle 6)
 * - timestamps are epoch milliseconds as BIGINT (see db.ts for the int8 -> number parser)
 */
export const up = (pgm) => {
  pgm.createTable('objects', {
    id: { type: 'text', primaryKey: true },
    slug: { type: 'text', notNull: true, unique: true },
    name: { type: 'text', notNull: true },
    created_at: { type: 'bigint', notNull: true },
  });

  pgm.createTable('attributes', {
    id: { type: 'text', primaryKey: true },
    object_id: { type: 'text', notNull: true, references: 'objects(id)', onDelete: 'CASCADE' },
    key: { type: 'text', notNull: true },
    label: { type: 'text', notNull: true },
    // text | number | select | date | email | url | checkbox (validated in packages/shared)
    type: { type: 'text', notNull: true },
    options: { type: 'jsonb', notNull: true, default: pgm.func("'[]'::jsonb") },
  });
  pgm.addConstraint('attributes', 'attributes_object_id_key_unique', {
    unique: ['object_id', 'key'],
  });

  pgm.createTable('records', {
    id: { type: 'text', primaryKey: true },
    object_id: { type: 'text', notNull: true, references: 'objects(id)', onDelete: 'CASCADE' },
    data: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    version: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'bigint', notNull: true },
    updated_at: { type: 'bigint', notNull: true },
  });
  pgm.createIndex('records', 'object_id');
};

export const down = (pgm) => {
  pgm.dropTable('records');
  pgm.dropTable('attributes');
  pgm.dropTable('objects');
};
