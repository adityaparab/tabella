import { describe, expect, it } from 'vitest';
import { listObjectsResponseSchema } from '@tabella/shared';
import { buildApp } from './app.js';
import { checkDatabase } from './db.js';

const dbUp = await checkDatabase();

describe('GET /api/objects', () => {
  it.skipIf(!dbUp)('returns a schema-valid catalog from the database', async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/api/objects' });

    expect(res.statusCode).toBe(200);
    const body = listObjectsResponseSchema.parse(res.json());
    // Catalog contents depend on whether the DB was seeded; the contract does not.
    expect(Array.isArray(body.objects)).toBe(true);
    for (const object of body.objects) {
      expect(object.id).toBeTruthy();
      expect(object.attributes.length).toBeGreaterThan(0);
    }
  });
});

describe('GET /api/health', () => {
  it('reports ok exactly when the database is reachable', async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/api/health' });

    expect(res.statusCode).toBe(200);
    // CI has no Postgres on this branch (Cycle 2 adds a service container), so the
    // contract under test is the status/db coupling, not a specific environment.
    expect(res.json()).toMatchObject({
      status: res.json().db === 'up' ? 'ok' : 'degraded',
    });
  });
});
