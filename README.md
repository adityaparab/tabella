# Tabella

> A *tabella* was ancient Rome's wax writing tablet — the original real-time, rewritable record.

**Tabella** is an open-source, AI-native mini-CRM: a flexible data model, a 100k-row table
that feels instant, live multi-client sync, and an [MCP](https://modelcontextprotocol.io)
server that lets AI agents like Claude operate on the data — with agent edits visible in
the UI in real time.

**Status:** 🚧 Cycle 2 of 7 complete — 100k correlated records behind a real query engine. See
[docs/PRD.md](docs/PRD.md) and the [CHANGELOG](CHANGELOG.md) for where things stand.

- **Live demo:** https://web-production-13ef0a.up.railway.app
- **Live API:** https://server-production-686b5.up.railway.app/api/objects · [health](https://server-production-686b5.up.railway.app/api/health)
- Try it: [deals filtered + sorted](https://server-production-686b5.up.railway.app/api/objects/deals/records?limit=5&sort=%5B%7B%22key%22%3A%22value%22%2C%22dir%22%3A%22desc%22%7D%5D) over 100k records — p95 ~50ms deployed, ~5ms local

## Quickstart (local)

```bash
pnpm install
docker compose up -d db   # local Postgres 16 on :5433
pnpm migrate              # apply migrations (node-pg-migrate)
pnpm dev                  # boots the API server (apps/server) and web app (apps/web)
```

- API: http://localhost:3001 — try `curl http://localhost:3001/api/objects`
- Web: http://localhost:5173

Requires Node >= 22, pnpm >= 10, and Docker (for the database).

## Repository layout

```
apps/server   Fastify API + WebSocket hub (Node, TypeScript)
apps/web      React web app (Vite, TanStack Query/Virtual)
apps/mcp      MCP server (stdio) — agents operate via the same REST API
packages/shared  Zod schemas + WS message types shared by all three
```

## License

[MIT](LICENSE)
