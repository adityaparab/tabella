# Tabella

> A *tabella* was ancient Rome's wax writing tablet — the original real-time, rewritable record.

**Tabella** is an open-source, AI-native mini-CRM: a flexible data model, a 100k-row table
that feels instant, live multi-client sync, and an [MCP](https://modelcontextprotocol.io)
server that lets AI agents like Claude operate on the data — with agent edits visible in
the UI in real time.

**Status:** 🚧 Cycle 1 of 7 — skeleton in progress. See [docs/PRD.md](docs/PRD.md) and the
[CHANGELOG](CHANGELOG.md) for where things stand.

## Quickstart (local)

```bash
pnpm install
pnpm dev        # boots the API server (apps/server) and web app (apps/web) together
```

- API: http://localhost:3001 — try `curl http://localhost:3001/api/objects`
- Web: http://localhost:5173

Requires Node >= 22 and pnpm >= 10.

## Repository layout

```
apps/server   Fastify API + WebSocket hub (Node, TypeScript)
apps/web      React web app (Vite, TanStack Query/Virtual)
apps/mcp      MCP server (stdio) — agents operate via the same REST API
packages/shared  Zod schemas + WS message types shared by all three
```

## License

[MIT](LICENSE)
