import type { Attribute, ObjectWithAttributes } from '@tabella/shared';
import { query } from '../db.js';

interface ObjectRow {
  id: string;
  slug: string;
  name: string;
  created_at: number;
}

interface AttributeRow {
  id: string;
  object_id: string;
  key: string;
  label: string;
  type: string;
  options: unknown;
}

function toAttribute(row: AttributeRow): Attribute {
  return {
    id: row.id,
    objectId: row.object_id,
    key: row.key,
    label: row.label,
    // The catalog only ever writes string[]; anything else is corruption we want loud.
    type: row.type as Attribute['type'],
    options: Array.isArray(row.options) ? (row.options as string[]) : [],
  };
}

export async function listObjects(): Promise<ObjectWithAttributes[]> {
  const objects = await query<ObjectRow>(
    'SELECT id, slug, name, created_at FROM objects ORDER BY created_at, id',
  );
  if (objects.length === 0) return [];
  const attributes = await query<AttributeRow>(
    'SELECT id, object_id, key, label, type, options FROM attributes ORDER BY object_id, key',
  );
  const byObject = new Map<string, Attribute[]>();
  for (const row of attributes) {
    const bucket = byObject.get(row.object_id) ?? [];
    bucket.push(toAttribute(row));
    byObject.set(row.object_id, bucket);
  }
  return objects.map((object) => ({
    id: object.id,
    slug: object.slug,
    name: object.name,
    createdAt: object.created_at,
    attributes: byObject.get(object.id) ?? [],
  }));
}

export async function getObjectBySlug(slug: string): Promise<ObjectWithAttributes | null> {
  const objects = await query<ObjectRow>(
    'SELECT id, slug, name, created_at FROM objects WHERE slug = $1',
    [slug],
  );
  const object = objects[0];
  if (!object) return null;
  const attributes = await query<AttributeRow>(
    'SELECT id, object_id, key, label, type, options FROM attributes WHERE object_id = $1 ORDER BY key',
    [object.id],
  );
  return {
    id: object.id,
    slug: object.slug,
    name: object.name,
    createdAt: object.created_at,
    attributes: attributes.map(toAttribute),
  };
}
