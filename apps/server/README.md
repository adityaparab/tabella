# @tabella/server

Fastify API + query engine + seed for Tabella. Talks to Postgres (ADR-0001) via a single
`pg.Pool` per process.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | tsx watch on `src/index.ts` (API on :3001) |
| `pnpm build` / `pnpm start` | tsc → `dist/`, then run the compiled server |
| `pnpm test` | vitest; globalSetup migrates + seeds a small fixture DB first |
| `pnpm migrate` | apply `migrations/` (node-pg-migrate) — `DATABASE_URL` or local default |
| `pnpm seed` | reset to the full 100k deterministic dataset (`--small` for fixtures) |
| `pnpm bench` | HTTP p50/p95/p99 over five query shapes (`BASE_URL`, `N` env) |

## Configuration

Environment (all optional locally — defaults match `compose.yaml` postgres:16 on :5433):

- `DATABASE_URL` — Postgres connection string
- `PORT` / `HOST` — defaults `3001` / `0.0.0.0`
- `CORS_ORIGIN` — `*` (reflect), a specific origin, or unset for reflect-all (demo)

## Layout

- `src/query/engine.ts` — compiles filter/sort/cursor to parameterized SQL; expression
  shapes must match the indexes (ADR-0002)
- `src/repo/` — objects catalog + records CRUD (field-level JSONB merge, version bump)
- `src/seed/` — deterministic generator + batched writer behind `POST /api/demo/reseed`
- `migrations/` — node-pg-migrate; also runs as the Railway release command
