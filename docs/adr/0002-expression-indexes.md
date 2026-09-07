# ADR-0002: Expression indexes for hot JSONB keys

- **Status:** Accepted (Cycle 2)
- **Date:** 2026-09-08

## Context

Records live in a JSONB column (ADR-0001), so filters and sorts compile to expressions
like `data->>'stage' = $2`. Without indexes, every filtered query is a seq scan. We know
which keys the demo hammers (they're the seed's own catalog): name, stage, value, owner,
and the two hot dates. User-defined attributes created at runtime won't have indexes —
that's the documented trade-off, not an accident.

## Decision

Expression indexes on the hot keys — `lower(data->>'name')` for text (case-insensitive
matching), `(data->>'value')::numeric` for numbers, plain `data->>'key'` for select/date —
each as `(object_id, <expr>, id)`. The leading `object_id` scopes every query; the
trailing `id` makes the keyset-pagination sort tuple fully index-covered. A GIN index on
`data` backs ad-hoc containment (`data @> ...`) for everything else.

The query compiler is therefore expression-bound: it must emit exactly these shapes
(lower() for text, ::numeric for numbers) or the index is silently unused.

## Consequences

- Filtered/sorted queries over 100k rows stay in single-digit milliseconds (EXPLAIN-verified
  index scans, not seq scans).
- Case-insensitive matching is an index property, not just a `WHERE` nicety.
- New hot keys require a migration — acceptable while the catalog is seed-controlled;
  post-MVP, index provisioning on attribute creation is the upgrade path.
- GIN adds write cost and ~tens of MB; fine at demo scale.
