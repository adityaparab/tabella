import { describe, expect, it } from 'vitest';
import { listObjectsResponseSchema } from '@tabella/shared';
import { buildApp } from './app.js';

describe('GET /api/objects', () => {
  it('returns a schema-valid catalog containing the Companies object', async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/api/objects' });

    expect(res.statusCode).toBe(200);
    const body = listObjectsResponseSchema.parse(res.json());
    expect(body.objects).toHaveLength(1);

    const companies = body.objects[0];
    expect(companies?.name).toBe('Companies');
    expect(companies?.slug).toBe('companies');
    expect(companies?.attributes.length).toBeGreaterThan(0);
  });
});

describe('GET /api/health', () => {
  it('reports ok', async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/api/health' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
  });
});
