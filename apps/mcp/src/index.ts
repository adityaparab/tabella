/**
 * MCP server (stdio transport) — ships in Cycle 3 (#8).
 *
 * Five tools — list_objects, query_records, get_record, create_record, update_record —
 * each a thin wrapper over the Tabella REST API, so agents and humans share one source
 * of truth and agent mutations fan out over the same WebSocket as human edits.
 */

export const MCP_STATUS = 'planned-cycle-3' as const;
