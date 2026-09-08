# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] — 2026-09-08

### Added

- **MCP server** (#8): `apps/mcp` (stdio, `@modelcontextprotocol/sdk`) with five tools —
  `list_objects`, `query_records` (filter/sort/cursor with `total`), `get_record`,
  `create_record`, `update_record` — thin wrappers over the same REST API as the web app.
  Records flattened for model readability; shared zod schemas reused for tool inputs.
- **Claude Desktop verification** (#9): live conversation against the deployed API —
  *"how many deals are in Negotiation?"* answered from `total: 2408`; *"create a deal at
  Northwind, stage Proposal, value 40k"* produced a validated record that even linked the
  existing Northwind company. Copy-paste config snippet in the README.
- **Web foundation** (#10): app shell, object switcher tabs, TanStack Query record
  fetching with a "50 shown of 100,000" count badge and loading/error/empty states.
- **MCP tests** (#11): tool-level suite through a real MCP client/server pair (in-memory
  transport, mocked fetch) covering discovery, query compilation, and error propagation.
- Optional MCP API call log (`TABELLA_MCP_LOG`) for demos and gate checks.

[Unreleased]: https://github.com/adityaparab/tabella/commits/main
[0.3.0]: https://github.com/adityaparab/tabella/releases/tag/v0.3.0

## [0.2.0] — 2026-09-08

### Added

- **Seed data** (#4): deterministic 100k-record dataset (companies 40k / people 40k / deals
  20k) with correlated distributions — weighted stages, log-normal values scaled by stage
  and industry, people weighted toward bigger companies, deals linked to a real company
  contact. `POST /api/demo/reseed` resets full or custom counts; 100k rows land in ~1s
  locally (8s deployed).
- **Expression indexes** (#5, ADR-0002): `(object_id, <expr>, id)` on the six hot JSONB
  keys + GIN fallback; EXPLAIN-verified index scans over 100k rows.
- **Records REST API** (#6): `GET/POST /api/objects/:slug/records`,
  `GET/PATCH/DELETE /api/records/:id` — server-side filter (eq/neq/contains/gt/gte/lt/lte/
  in/is_empty, type-gated), sort, and stable keyset cursor pagination (OR-of-ANDs
  expansion, id tiebreak); field-level PATCH with version bump; data validated against
  the attribute catalog; every page carries `total`.
- **Query-engine tests + CI database** (#7): 17 tests incl. cursor-stability walks,
  unicode, JSONB nulls, filter/sort combos; CI runs them against a `postgres:16` service
  container; `pnpm --filter @tabella/server bench` measures p50/p95/p99 over HTTP.

### Measured

- Local (Docker Postgres, 100k rows): p95 4.1–7.3ms across five query shapes.
- Deployed (Railway, incl. client RTT): p95 47.1–59.1ms.

[Unreleased]: https://github.com/adityaparab/tabella/commits/main
[0.2.0]: https://github.com/adityaparab/tabella/releases/tag/v0.2.0

## [0.1.0] — 2026-09-07

### Added

- Monorepo skeleton: pnpm + Turborepo with `apps/server`, `apps/web`, `apps/mcp`,
  `packages/shared`; shared tsconfig, ESLint flat config, GitHub Actions CI
  (lint + typecheck + test + build).
- `packages/shared`: zod schemas for objects, attributes, records, and API responses —
  the single contract shared by server, web, and MCP.
- API: Fastify server with `GET /api/objects` (hardcoded Companies catalog) and
  `GET /api/health`.
- Web: Vite + React app rendering the objects catalog from the API.
- Database (ADR-0001): node-pg-migrate migration for `objects`, `attributes`, `records`
  (JSONB `data`, `version`, epoch-ms bigint timestamps); single `pg.Pool` wired into
  Fastify; `/api/health` reflects DB reachability; local postgres:16 via `docker compose`.
- Deployment: Railway project — managed Postgres (private networking), server service
  (turbo-filtered build, migrations as release command), static web service. Deployed
  web renders data from the deployed API.
- Process: PRD, ADR-0001, Cycle 1–7 milestones, 26 backlog issues, squash-merged PRs
  (#27, #28, #29).

[Unreleased]: https://github.com/adityaparab/tabella/commits/main
[0.1.0]: https://github.com/adityaparab/tabella/releases/tag/v0.1.0
