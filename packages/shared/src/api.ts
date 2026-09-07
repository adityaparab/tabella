import { z } from 'zod';
import { fieldValueSchema, recordSchema } from './schemas.js';

/**
 * REST API contract shapes (query params + bodies + responses). The web app and the MCP
 * server build requests against these; the server validates with the same schemas.
 */

export const FILTER_OPERATORS = [
  'eq',
  'neq',
  'contains',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'is_empty',
] as const;
export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export const filterConditionSchema = z.object({
  /** Attribute key (e.g. "stage") or a meta key ("created_at", "updated_at", "version"). */
  key: z.string().min(1).max(64),
  op: z.enum(FILTER_OPERATORS),
  /** Scalar, or an array when op is "in". */
  value: z.union([fieldValueSchema, z.array(fieldValueSchema)]).optional(),
});
export type FilterCondition = z.infer<typeof filterConditionSchema>;

export const sortDirectionSchema = z.enum(['asc', 'desc']);
export type SortDirection = z.infer<typeof sortDirectionSchema>;

export const sortSpecSchema = z.object({
  key: z.string().min(1).max(64),
  dir: sortDirectionSchema.default('asc'),
});
export type SortSpec = z.infer<typeof sortSpecSchema>;

/** GET /api/objects/:slug/records?filter=<json>&sort=<json>&cursor=&limit= */
export const listRecordsQuerySchema = z.object({
  filter: z.array(filterConditionSchema).max(8).default([]),
  sort: z.array(sortSpecSchema).max(3).default([]),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type ListRecordsQuery = z.infer<typeof listRecordsQuerySchema>;

export const listRecordsResponseSchema = z.object({
  records: z.array(recordSchema),
  nextCursor: z.string().nullable(),
  /** Total matching rows for the current filter (ignores cursor) — powers "20,000 deals". */
  total: z.number().int().nonnegative(),
});
export type ListRecordsResponse = z.infer<typeof listRecordsResponseSchema>;

export const createRecordBodySchema = z.object({
  data: z.record(z.string(), fieldValueSchema),
});
export type CreateRecordBody = z.infer<typeof createRecordBodySchema>;

export const patchRecordBodySchema = z.object({
  /** Field-level patch: only the provided keys are set (null clears a field). */
  data: z.record(z.string(), fieldValueSchema),
});
export type PatchRecordBody = z.infer<typeof patchRecordBodySchema>;

export const errorResponseSchema = z.object({
  error: z.string(),
  issues: z
    .array(z.object({ path: z.string(), message: z.string() }))
    .optional(),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
