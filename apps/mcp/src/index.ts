import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { API_URL } from './config.js';
import { registerTools } from './tools.js';

const server = new McpServer(
  { name: 'tabella', version: '0.3.0' },
  {
    instructions:
      'Tabella is a mini-CRM with a flexible data model. Start with list_objects to ' +
      'discover objects and their attribute keys, then query_records (its `total` answers ' +
      'counting questions), and get/create/update_record to read and mutate. ' +
      `This server talks to the Tabella API at ${API_URL}.`,
  },
);

registerTools(server);

await server.connect(new StdioServerTransport());
