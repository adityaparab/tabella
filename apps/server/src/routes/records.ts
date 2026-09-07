import type { FastifyPluginAsync } from 'fastify';
import {
  createRecordBodySchema,
  listRecordsQuerySchema,
  patchRecordBodySchema,
  type ListRecordsQuery,
} from '@tabella/shared';
import { QueryValidationError } from '../query/engine.js';
import { createRecord, deleteRecord, getRecord, listRecords, patchRecord, RecordNotFound } from '../repo/records.js';
import { getObjectBySlug, listObjects } from '../repo/objects.js';
import { validateRecordData } from '../validate.js';

/** Parse the JSON-encoded `filter` / `sort` query params, then the shared schema. */
function parseListQuery(urlQuery: Record<string, string | string[] | undefined>): ListRecordsQuery {
  const raw = (key: string): string | undefined =>
    Array.isArray(urlQuery[key]) ? (urlQuery[key] as string[])[0] : (urlQuery[key] as string | undefined);

  const filter = raw('filter') ?? '[]';
  const sort = raw('sort') ?? '[]';
  let filterJson: unknown;
  let sortJson: unknown;
  try {
    filterJson = JSON.parse(filter);
    sortJson = JSON.parse(sort);
  } catch {
    throw new QueryValidationError('filter and sort must be JSON arrays', [
      { path: 'filter', message: 'Invalid JSON' },
    ]);
  }
  return listRecordsQuerySchema.parse({
    filter: filterJson,
    sort: sortJson,
    cursor: raw('cursor'),
    limit: raw('limit'),
  });
}

export const recordsRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { slug: string } }>('/objects/:slug/records', async (request, reply) => {
    const object = await getObjectBySlug(request.params.slug);
    if (!object) return reply.code(404).send({ error: `Unknown object "${request.params.slug}"` });

    try {
      const listQuery = parseListQuery(request.query as Record<string, string>);
      return await listRecords(object.id, object.attributes, listQuery);
    } catch (err) {
      if (err instanceof QueryValidationError) {
        return reply.code(400).send({ error: err.message, issues: err.issues });
      }
      throw err;
    }
  });

  app.post<{ Params: { slug: string } }>('/objects/:slug/records', async (request, reply) => {
    const object = await getObjectBySlug(request.params.slug);
    if (!object) return reply.code(404).send({ error: `Unknown object "${request.params.slug}"` });

    const body = createRecordBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid body', issues: summarize(body.error.issues) });
    }
    const issues = validateRecordData(object.attributes, body.data.data);
    if (issues.length > 0) {
      return reply.code(400).send({ error: 'Data failed validation', issues });
    }
    const record = await createRecord(object.id, body.data.data);
    return reply.code(201).send(record);
  });

  app.get<{ Params: { id: string } }>('/records/:id', async (request, reply) => {
    try {
      return await getRecord(request.params.id);
    } catch (err) {
      if (err instanceof RecordNotFound) return reply.code(404).send({ error: err.message });
      throw err;
    }
  });

  app.patch<{ Params: { id: string } }>('/records/:id', async (request, reply) => {
    const body = patchRecordBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid body', issues: summarize(body.error.issues) });
    }
    const existing = await getRecord(request.params.id).catch(() => null);
    if (!existing) return reply.code(404).send({ error: `Record ${request.params.id} not found` });

    const issues = validateRecordData(
      await attributeDefsFor(existing.objectId),
      body.data.data,
    );
    if (issues.length > 0) {
      return reply.code(400).send({ error: 'Data failed validation', issues });
    }
    const record = await patchRecord(request.params.id, body.data.data);
    return record;
  });

  app.delete<{ Params: { id: string } }>('/records/:id', async (request, reply) => {
    try {
      await deleteRecord(request.params.id);
      return reply.code(204).send();
    } catch (err) {
      if (err instanceof RecordNotFound) return reply.code(404).send({ error: err.message });
      throw err;
    }
  });
};

function summarize(issues: { path: (string | number | symbol)[]; message: string }[]) {
  return issues.map((issue) => ({
    path: issue.path.map(String).join('.') || '(root)',
    message: issue.message,
  }));
}

async function attributeDefsFor(objectId: string) {
  const objects = await listObjects();
  return objects.find((object) => object.id === objectId)?.attributes ?? [];
}
