import { beforeAll, describe, expect, it } from 'vitest';
import { listRecordsResponseSchema } from '@tabella/shared';
import { buildApp } from './app.js';
import { checkDatabase } from './db.js';

/**
 * DB-backed tests against the small deterministic fixture seeded by test/global-setup.ts.
 * They skip when no database is reachable (until CI provides the postgres:16 service,
 * every case here also passes against local Docker Postgres).
 */
const dbUp = await checkDatabase();
const app = dbUp ? await buildApp({ logger: false }) : null;

if (dbUp && app) {
  beforeAll(async () => {
    const health = await app.inject({ method: 'GET', url: '/api/health' });
    expect(health.json()).toMatchObject({ status: 'ok', db: 'up' });
  });
}

const q = (params: Record<string, string>): string =>
  new URLSearchParams(params).toString();

describe.skipIf(!dbUp)('GET /api/objects/:slug/records', () => {
  it('returns a schema-valid page with a total', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/objects/deals/records?limit=5' });
    expect(res.statusCode).toBe(200);
    const body = listRecordsResponseSchema.parse(res.json());
    expect(body.records).toHaveLength(5);
    expect(body.total).toBe(30);
    expect(typeof body.nextCursor).toBe('string');
  });

  it('returns empty (not an error) for a filter matching nothing', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: `/api/objects/deals/records?${q({ filter: JSON.stringify([{ key: 'stage', op: 'eq', value: 'Does Not Exist' }]) })}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.records).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.nextCursor).toBeNull();
  });

  it('matches unicode and case-insensitively via contains', async () => {
    const created = await app!.inject({
      method: 'POST',
      url: '/api/objects/companies/records',
      payload: { data: { name: 'Ünïcode Gmbh Ünïcode', industry: 'SaaS' } },
    });
    expect(created.statusCode).toBe(201);

    const res = await app!.inject({
      method: 'GET',
      url: `/api/objects/companies/records?${q({ filter: JSON.stringify([{ key: 'name', op: 'contains', value: 'ünïcode' }]) })}`,
    });
    const body = res.json();
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(body.records.some((r: { data: { name: string } }) => r.data.name === 'Ünïcode Gmbh Ünïcode')).toBe(true);

    await app!.inject({ method: 'DELETE', url: `/api/records/${created.json().id}` });
  });

  it('treats missing JSONB keys as null (is_empty)', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: `/api/objects/deals/records?${q({ filter: JSON.stringify([{ key: 'close_date', op: 'is_empty' }]) })}`,
    });
    const body = res.json();
    expect(body.total).toBeGreaterThan(0);
    expect(body.total).toBeLessThan(30);
    for (const record of body.records) {
      expect(record.data.close_date ?? null).toBeNull();
    }
  });

  it('rejects unknown filter keys and malformed cursors with 400', async () => {
    const badKey = await app!.inject({
      method: 'GET',
      url: `/api/objects/deals/records?${q({ filter: JSON.stringify([{ key: 'nope', op: 'eq', value: 1 }]) })}`,
    });
    expect(badKey.statusCode).toBe(400);

    const badCursor = await app!.inject({
      method: 'GET',
      url: `/api/objects/deals/records?${q({ cursor: 'garbage!' })}`,
    });
    expect(badCursor.statusCode).toBe(400);
  });

  it('keeps cursors stable: full walks have no dupes/misses and are deterministic', async () => {
    const walk = async (): Promise<string[]> => {
      const ids: string[] = [];
      let cursor: string | null = null;
      do {
        const url = `/api/objects/deals/records?${q({
          limit: '7',
          sort: JSON.stringify([{ key: 'stage', dir: 'asc' }, { key: 'value', dir: 'desc' }]),
          ...(cursor ? { cursor } : {}),
        })}`;
        const body = (await app!.inject({ method: 'GET', url })).json();
        ids.push(...body.records.map((r: { id: string }) => r.id));
        cursor = body.nextCursor;
      } while (cursor);
      return ids;
    };
    const [first, second] = [await walk(), await walk()];
    expect(new Set(first).size).toBe(first.length); // no dupes
    expect(first.length).toBe(30); // no misses
    expect(second).toEqual(first); // deterministic under repetition
  });

  it('applies filter+sort combinations correctly', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: `/api/objects/deals/records?${q({
        limit: '200',
        filter: JSON.stringify([
          { key: 'stage', op: 'in', value: ['Negotiation', 'Won'] },
          { key: 'value', op: 'gte', value: 1000 },
        ]),
        sort: JSON.stringify([{ key: 'value', dir: 'desc' }]),
      })}`,
    });
    const body = res.json();
    expect(body.total).toBeGreaterThan(0);
    expect(body.total).toBeLessThanOrEqual(30);
    const values = body.records.map((r: { data: { value: number; stage: string } }) => r.data.value);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1]); // desc
    }
    for (const record of body.records) {
      expect(['Negotiation', 'Won']).toContain(record.data.stage);
    }
  });

  it('rejects operator/type mismatches', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: `/api/objects/deals/records?${q({ filter: JSON.stringify([{ key: 'stage', op: 'gt', value: 'A' }]) })}`,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/not supported/);
  });
});

describe.skipIf(!dbUp)('record CRUD', () => {
  it('creates, patches field-level with version bump, null-clears, and deletes', async () => {
    const created = await app!.inject({
      method: 'POST',
      url: '/api/objects/deals/records',
      payload: { data: { name: 'Test Co — Pilot', stage: 'New', value: 12345 } },
    });
    expect(created.statusCode).toBe(201);
    const record = created.json();
    expect(record.version).toBe(1);

    const patched = await app!.inject({
      method: 'PATCH',
      url: `/api/records/${record.id}`,
      payload: { data: { stage: 'Won', close_date: '2026-09-08' } },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().version).toBe(2);
    expect(patched.json().data.name).toBe('Test Co — Pilot'); // untouched field survives
    expect(patched.json().data.stage).toBe('Won');

    const cleared = await app!.inject({
      method: 'PATCH',
      url: `/api/records/${record.id}`,
      payload: { data: { close_date: null } },
    });
    expect(cleared.json().data.close_date ?? null).toBeNull();

    const fetched = await app!.inject({ method: 'GET', url: `/api/records/${record.id}` });
    expect(fetched.json().version).toBe(3);

    const deleted = await app!.inject({ method: 'DELETE', url: `/api/records/${record.id}` });
    expect(deleted.statusCode).toBe(204);
    const gone = await app!.inject({ method: 'GET', url: `/api/records/${record.id}` });
    expect(gone.statusCode).toBe(404);
  });

  it('rejects invalid data against the attribute catalog', async () => {
    const bad = await app!.inject({
      method: 'POST',
      url: '/api/objects/deals/records',
      payload: { data: { stage: 'Bogus', value: 'high', mystery_key: 1 } },
    });
    expect(bad.statusCode).toBe(400);
    const issues = bad.json().issues as { path: string }[];
    expect(issues.map((i) => i.path).sort()).toEqual(['mystery_key', 'stage', 'value']);
  });
});
