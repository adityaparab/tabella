import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { filterConditionSchema, sortSpecSchema } from '@tabella/shared';
import { api } from './api.js';

/**
 * Five thin tools over the Tabella REST API — the same source of truth the web app
 * uses. Schema discovery first (list_objects), then query/mutate. Records are
 * flattened ({id, ...data}) so models read rows without nested indirection.
 */

const dataSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
  .describe(
    'Record fields by attribute key. Keys must exist on the object (see list_objects); ' +
      'values must match the attribute type (select values must be allowed options). ' +
      'Use null to clear a field.',
  );

export function registerTools(server: McpServer): void {
  server.registerTool(
    'list_objects',
    {
      title: 'List objects',
      description:
        'Discover the schema: every object (companies, people, deals) with its attributes ' +
        '(key, label, type, select options). Call this first to learn valid keys.',
      inputSchema: {},
    },
    async () => {
      const response = (await api('/api/objects')) as {
        objects: {
          slug: string;
          name: string;
          attributes: { key: string; label: string; type: string; options: string[] }[];
        }[];
      };
      const objects = response.objects.map((object) => ({
        slug: object.slug,
        name: object.name,
        attributes: object.attributes.map((attr) => ({
          key: attr.key,
          label: attr.label,
          type: attr.type,
          ...(attr.options.length > 0 ? { options: attr.options } : {}),
        })),
      }));
      return text(objects);
    },
  );

  server.registerTool(
    'query_records',
    {
      title: 'Query records',
      description:
        'Query an object\'s records with server-side filter/sort. The response includes ' +
        '`total` (matching record count — use it for counting questions) and up to `limit` ' +
        'flattened records. Page with `cursor` from the previous response when needed.',
      inputSchema: {
        object: z.string().describe('Object slug, e.g. "deals"'),
        filter: z
          .array(filterConditionSchema)
          .max(8)
          .optional()
          .describe(
            'Conditions ANDed together, e.g. [{"key":"stage","op":"eq","value":"Negotiation"}]. ' +
              'ops: eq, neq, contains, gt, gte, lt, lte, in, is_empty',
          ),
        sort: z
          .array(sortSpecSchema)
          .max(3)
          .optional()
          .describe('Sort specs, e.g. [{"key":"value","dir":"desc"}]'),
        limit: z.number().int().min(1).max(50).default(20).describe('Max records to return'),
        cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      },
    },
    async ({ object, filter, sort, limit, cursor }) => {
      const q = new URLSearchParams({ limit: String(limit ?? 20) });
      if (filter && filter.length > 0) q.set('filter', JSON.stringify(filter));
      if (sort && sort.length > 0) q.set('sort', JSON.stringify(sort));
      if (cursor) q.set('cursor', cursor);
      const response = (await api(`/api/objects/${encodeURIComponent(object)}/records?${q}`)) as {
        records: { id: string; data: Record<string, unknown> }[];
        nextCursor: string | null;
        total: number;
      };
      return text({
        total: response.total,
        returned: response.records.length,
        ...(response.nextCursor ? { nextCursor: response.nextCursor } : {}),
        records: response.records.map((record) => ({ id: record.id, ...record.data })),
      });
    },
  );

  server.registerTool(
    'get_record',
    {
      title: 'Get record',
      description: 'Fetch a single record by id (flattened fields).',
      inputSchema: {
        id: z.string().describe('Record id, e.g. "rec_de0000042"'),
      },
    },
    async ({ id }) => {
      const record = (await api(`/api/records/${encodeURIComponent(id)}`)) as {
        id: string;
        data: Record<string, unknown>;
      };
      return text({ id: record.id, ...record.data });
    },
  );

  server.registerTool(
    'create_record',
    {
      title: 'Create record',
      description:
        'Create a record on an object. Fields are validated against the attribute catalog — ' +
        'call list_objects for valid keys and select options.',
      inputSchema: {
        object: z.string().describe('Object slug, e.g. "deals"'),
        data: dataSchema,
      },
    },
    async ({ object, data }) => {
      const record = (await api(`/api/objects/${encodeURIComponent(object)}/records`, {
        method: 'POST',
        body: JSON.stringify({ data }),
      })) as { id: string; data: Record<string, unknown> };
      return text({ created: { id: record.id, ...record.data } });
    },
  );

  server.registerTool(
    'update_record',
    {
      title: 'Update record',
      description:
        'Field-level update: only the provided keys change, null clears a field. ' +
        'Returns the updated record with its new version.',
      inputSchema: {
        id: z.string().describe('Record id to update'),
        data: dataSchema,
      },
    },
    async ({ id, data }) => {
      const record = (await api(`/api/records/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ data }),
      })) as { id: string; version: number; data: Record<string, unknown> };
      return text({ updated: { id: record.id, version: record.version, ...record.data } });
    },
  );
}

function text(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}
