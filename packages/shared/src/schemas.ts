import { z } from 'zod';

/**
 * Core domain schemas. These are the single source of truth shared by the API server,
 * the web app, and the MCP server: requests and responses are validated against them,
 * and the WS envelopes (Cycle 5) will be too.
 */

export const ATTRIBUTE_TYPES = [
  'text',
  'number',
  'select',
  'date',
  'email',
  'url',
  'checkbox',
] as const;
export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

/** A user-defined field on an object, e.g. deals.stage (select). */
export const attributeSchema = z.object({
  id: z.string().min(1),
  objectId: z.string().min(1),
  key: z.string().regex(/^[a-z][a-z0-9_]*$/, 'keys are lowercase snake_case'),
  label: z.string().min(1),
  type: z.enum(ATTRIBUTE_TYPES),
  /** For select attributes: the allowed option values. */
  options: z.array(z.string()).default([]),
});
export type Attribute = z.infer<typeof attributeSchema>;

/** A user-defined entity type, e.g. companies / people / deals. */
export const tabellaObjectSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z][a-z0-9-]*$/, 'slugs are lowercase kebab-case'),
  name: z.string().min(1),
  createdAt: z.number().int().nonnegative(),
});
export type TabellaObject = z.infer<typeof tabellaObjectSchema>;

/** An object together with its attribute definitions. */
export const objectWithAttributesSchema = tabellaObjectSchema.extend({
  attributes: z.array(attributeSchema),
});
export type ObjectWithAttributes = z.infer<typeof objectWithAttributesSchema>;

/** The value types a cell can hold. Dates are ISO strings. */
export const fieldValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export type FieldValue = z.infer<typeof fieldValueSchema>;

/** A record: the JSONB payload plus bookkeeping used for sync (versions, timestamps). */
export const recordSchema = z.object({
  id: z.string().min(1),
  objectId: z.string().min(1),
  data: z.record(z.string(), fieldValueSchema),
  version: z.number().int().positive(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});
export type TabellaRecord = z.infer<typeof recordSchema>;

/** GET /api/objects */
export const listObjectsResponseSchema = z.object({
  objects: z.array(objectWithAttributesSchema),
});
export type ListObjectsResponse = z.infer<typeof listObjectsResponseSchema>;

/** GET /api/health */
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  db: z.enum(['up', 'down']),
  time: z.number().int().nonnegative(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
