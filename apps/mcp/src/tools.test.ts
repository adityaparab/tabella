import { afterEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  InMemoryTransport,
} from '@modelcontextprotocol/sdk/inMemory.js';
import { registerTools } from './tools.js';

/**
 * Tool-level tests through a real MCP client/server pair over an in-memory transport,
 * with fetch mocked — the HTTP layer is exercised end-to-end by the server suite and
 * scripts/smoke.ts; here we assert the tool contract: request shapes and result text.
 */

interface CapturedRequest {
  url: string;
  init: RequestInit | undefined;
}

function withFetchMock(responses: ((req: CapturedRequest) => { status: number; body: unknown })[]) {
  const requests: CapturedRequest[] = [];
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = { url: String(input), init };
    requests.push(req);
    const handler = responses[Math.min(requests.length - 1, responses.length - 1)]!;
    const { status, body } = handler(req);
    return new Response(body === null ? null : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', mock);
  return { requests };
}

async function withClient(): Promise<Client> {
  const server = new McpServer({ name: 'test', version: '0' });
  registerTools(server);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'test-client', version: '0' });
  await client.connect(clientTransport);
  return client;
}

const textOf = (result: { content: { type: string; text?: string }[] }) => {
  const block = result.content.find((c) => c.type === 'text');
  return JSON.parse(block!.text!);
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('list_objects', () => {
  it('surfaces slugs, attribute keys, and select options for schema discovery', async () => {
    const { requests } = withFetchMock([
      () => ({
        status: 200,
        body: {
          objects: [
            {
              id: 'obj_deals',
              slug: 'deals',
              name: 'Deals',
              createdAt: 0,
              attributes: [
                { id: 'a', objectId: 'obj_deals', key: 'stage', label: 'Stage', type: 'select', options: ['New', 'Won'] },
                { id: 'b', objectId: 'obj_deals', key: 'value', label: 'Value', type: 'number', options: [] },
              ],
            },
          ],
        },
      }),
    ]);
    const client = await withClient();
    const result = textOf(await client.callTool({ name: 'list_objects', arguments: {} })) as {
      slug: string;
      attributes: { key: string; options?: string[] }[];
    }[];

    expect(requests[0]!.url).toBe('http://localhost:3001/api/objects');
    expect(result[0]?.slug).toBe('deals');
    const stage = result[0]?.attributes.find((a) => a.key === 'stage');
    expect(stage?.options).toEqual(['New', 'Won']);
    // empty options arrays are dropped to keep discovery output lean
    expect(result[0]?.attributes.find((a) => a.key === 'value')).not.toHaveProperty('options');
  });
});

describe('query_records', () => {
  it('compiles filter/sort/limit into the REST query string', async () => {
    const { requests } = withFetchMock([
      () => ({
        status: 200,
        body: { records: [{ id: 'r1', data: { stage: 'Negotiation', value: 5 } }], nextCursor: null, total: 1 },
      }),
    ]);
    const client = await withClient();
    const result = textOf(
      await client.callTool({
        name: 'query_records',
        arguments: {
          object: 'deals',
          filter: [{ key: 'stage', op: 'eq', value: 'Negotiation' }],
          sort: [{ key: 'value', dir: 'desc' }],
          limit: 5,
        },
      }),
    );

    const url = new URL(requests[0]!.url);
    expect(url.pathname).toBe('/api/objects/deals/records');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(JSON.parse(url.searchParams.get('filter')!)).toEqual([{ key: 'stage', op: 'eq', value: 'Negotiation' }]);
    expect(JSON.parse(url.searchParams.get('sort')!)).toEqual([{ key: 'value', dir: 'desc' }]);
    expect(result.total).toBe(1);
    expect(result.records[0]).toEqual({ id: 'r1', stage: 'Negotiation', value: 5 }); // flattened
  });

  it('passes cursors through for paging', async () => {
    const { requests } = withFetchMock([
      () => ({ status: 200, body: { records: [], nextCursor: null, total: 0 } }),
    ]);
    const client = await withClient();
    await client.callTool({
      name: 'query_records',
      arguments: { object: 'people', cursor: 'abc', limit: 20 },
    });
    const url = new URL(requests[0]!.url);
    expect(url.searchParams.get('cursor')).toBe('abc');
    expect(url.searchParams.get('limit')).toBe('20');
  });
});

describe('create_record / update_record', () => {
  it('sends the field data as JSON to the right paths', async () => {
    const { requests } = withFetchMock([
      () => ({ status: 201, body: { id: 'rec_new', objectId: 'o', data: { name: 'X', stage: 'New' }, version: 1, createdAt: 0, updatedAt: 0 } }),
      () => ({ status: 200, body: { id: 'rec_new', objectId: 'o', data: { name: 'X', stage: 'Won' }, version: 2, createdAt: 0, updatedAt: 0 } }),
    ]);
    const client = await withClient();

    const created = textOf(await client.callTool({
      name: 'create_record',
      arguments: { object: 'deals', data: { name: 'X', stage: 'New' } },
    }));
    expect(created.created).toEqual({ id: 'rec_new', name: 'X', stage: 'New' });

    const updated = textOf(await client.callTool({
      name: 'update_record',
      arguments: { id: 'rec_new', data: { stage: 'Won' } },
    }));
    expect(updated.updated).toEqual({ id: 'rec_new', version: 2, name: 'X', stage: 'Won' });

    expect(requests[0]!.url).toBe('http://localhost:3001/api/objects/deals/records');
    expect(requests[0]!.init?.method).toBe('POST');
    expect(JSON.parse(String(requests[0]!.init?.body))).toEqual({ data: { name: 'X', stage: 'New' } });
    expect(requests[1]!.url).toBe('http://localhost:3001/api/records/rec_new');
    expect(requests[1]!.init?.method).toBe('PATCH');
  });
});

describe('error propagation', () => {
  it('returns isError with the API message when validation fails', async () => {
    withFetchMock([
      () => ({
        status: 400,
        body: { error: 'Data failed validation', issues: [{ path: 'stage', message: '"Bogus" is not one of the allowed options' }] },
      }),
    ]);
    const client = await withClient();
    const result = await client.callTool({
      name: 'create_record',
      arguments: { object: 'deals', data: { stage: 'Bogus' } },
    });
    expect(result.isError).toBe(true);
    const text = result.content.find((c) => c.type === 'text')?.text ?? '';
    expect(text).toContain('not one of the allowed options');
  });
});
