# PRD — Tabella

One page, written before code. Scope details live in the issue tracker; this is the *why*.

## Problem

CRMs are rigid, and the "AI" in most AI-CRM products is a chat sidebar bolted onto a
legacy data model. Two things are missing:

1. **A data model that flexes** — every team wants different fields, and schema changes
   shouldn't require migrations or a support ticket.
2. **Agents as first-class users** — an AI agent that can actually read *and write* the CRM
   through the same API the UI uses, with its edits appearing live alongside human edits.

## Target user (for the MVP)

**The five-minute reviewer.** A developer or product engineer who lands on the README and
must be able to do all of this without help:

1. Open the live demo → scroll, filter, sort **100k rows** smoothly.
2. Open a second tab → edit a cell in one, watch it update live in the other.
3. Click **"Live load"** → watch hundreds of record updates stream in per second.
4. Connect Claude via the MCP config in the README → ask *"create a deal at Northwind,
   stage Proposal, value 40k"* → watch the row appear in the browser live.
5. Read the perf table + "What this demonstrates" → see measured numbers and engineering
   rationale, not claims.

If a feature doesn't serve this flow, it's out of scope.

## Scope (MVP)

- **Flexible data model**: objects + attributes metadata, records as JSONB payloads in
  Postgres, expression indexes on hot keys (ADR-0001).
- **A 100k-row table that feels instant**: server-side filter/sort/cursor pagination,
  virtualized grid with windowed fetching.
- **Real-time multi-client sync**: WebSocket fan-out, field-level last-writer-wins merge
  with per-record versions.
- **MCP server**: 5 tools (`list_objects`, `query_records`, `get_record`,
  `create_record`, `update_record`) over the same REST API as the web app.
- **Deployed demo** with measured performance numbers in the README.

## Non-goals (explicit cut list)

Auth / real user accounts (demo login = any email) · multi-workspace tenancy · saved
views · grouping/pivots/kanban · file attachments · mobile · i18n · full CRDT · billing.

## Success metrics

| Metric | Target | How measured |
|---|---|---|
| Scroll performance, 100k rows | no frame > 32ms | Chrome performance trace during full scroll |
| Keystroke → paint (inline edit) | < 100ms | React Profiler |
| Query latency p95 (filtered, sorted) | < 20ms local / < 80ms deployed same-region | server timing logs, scripted |
| Cross-tab sync latency | < 150ms | timestamp diff, two tabs |
| Stress ingest | 500 updates/sec, UI responsive | "Live load" mode |

## Delivery

Seven one-day cycles, one GitHub Milestone each; issues are written before work starts and
closed only with criteria checked. Each cycle ships a demoable state and tags a release.
