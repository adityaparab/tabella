# ADR-0001: Postgres with metadata tables + JSONB record payloads

- **Status:** Accepted (Cycle 1)
- **Date:** 2026-09-07

## Context

Tabella's core product promise is a *flexible* data model: users define objects and
attributes at runtime, so the schema is data, not DDL. At the same time the demo must run
filter/sort/pagination over 100k records with p95 < 20ms locally — that needs a real query
planner, not a scan over documents in memory. Deployment target is Railway, so a managed
relational database is one click away.

The classic flexible-schema options: EAV tables (join explosion, unusable planner),
document DB (weak relational integrity, weaker hosted story on the target platform), or
wide tables with dynamic columns (migration per attribute).

## Decision

PostgreSQL with three tables — `objects` and `attributes` as metadata, `records` holding
the payload as JSONB (`data`), a per-record `version` integer for last-writer-wins merge,
and epoch-millisecond BIGINT timestamps. Hot seeded keys (name, stage, value, owner, dates)
get expression indexes (`(data->>'stage')` etc. — `jsonb ->>` is immutable so it indexes
cleanly); a GIN index on `data` backs ad-hoc containment filters. Access is a single
`pg.Pool` per process. Migrations via node-pg-migrate, run as the Railway release command.

## Consequences

- Relational integrity for metadata, JSONB flexibility for payloads, and the Postgres
  planner for both — filters compile to parameterized `data->>'key' = $n` predicates.
- Un-indexed attributes fall back to seq scans; at 100k rows that's still milliseconds,
  and the README will be honest that indexes are provisioned for *known* hot keys.
- JSONB payloads mean no per-attribute foreign keys or column-level constraints; the
  application layer (zod, in `packages/shared`) owns field-type validation.
- Timestamps as BIGINT (not `timestamptz`) keep the wire format a plain number across
  API, WS, and JSONB payloads, at the cost of doing timezone rendering client-side.
