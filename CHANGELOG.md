# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
