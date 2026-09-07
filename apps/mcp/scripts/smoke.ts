/**
 * Drives the MCP server over stdio exactly like an MCP host (Claude Desktop) would.
 *   pnpm --filter @tabella/mcp smoke                (against the deployed API)
 *   TABELLA_API_URL=http://localhost:3001 pnpm ...  (against a local API)
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['dist/index.js'],
  env: { ...process.env, TABELLA_API_URL: process.env.TABELLA_API_URL ?? 'https://server-production-686b5.up.railway.app' },
});
const client = new Client({ name: 'tabella-smoke', version: '0.0.0' });
await client.connect(transport);

const show = (label: string, value: unknown) =>
  console.log(`\n== ${label} ==\n${typeof value === 'string' ? value : JSON.stringify(value, null, 2).slice(0, 700)}`);

const tools = await client.listTools();
show('tools', tools.tools.map((tool) => tool.name));

const objects = await client.callTool({ name: 'list_objects', arguments: {} });
show('list_objects (first object)', JSON.parse((objects.content as { text: string }[])[0]!.text)[0]);

const negotiation = await client.callTool({
  name: 'query_records',
  arguments: { object: 'deals', filter: [{ key: 'stage', op: 'eq', value: 'Negotiation' }], sort: [{ key: 'value', dir: 'desc' }], limit: 3 },
});
show('query_records stage=Negotiation', JSON.parse((negotiation.content as { text: string }[])[0]!.text));

const created = await client.callTool({
  name: 'create_record',
  arguments: { object: 'deals', data: { name: 'Smoke Test Co — Pilot', stage: 'Proposal', value: 12345 } },
});
const createdRecord = JSON.parse((created.content as { text: string }[])[0]!.text).created;
show('create_record', createdRecord);

const updated = await client.callTool({
  name: 'update_record',
  arguments: { id: createdRecord.id, data: { stage: 'Won', close_date: '2026-09-09' } },
});
show('update_record', JSON.parse((updated.content as { text: string }[])[0]!.text).updated);

const fetched = await client.callTool({ name: 'get_record', arguments: { id: createdRecord.id } });
show('get_record', JSON.parse((fetched.content as { text: string }[])[0]!.text));

// cleanup: the demo DB stays pristine
await fetch(`${process.env.TABELLA_API_URL ?? 'https://server-production-686b5.up.railway.app'}/api/records/${createdRecord.id}`, { method: 'DELETE' });
console.log('\ncleanup: deleted smoke record');

await client.close();
