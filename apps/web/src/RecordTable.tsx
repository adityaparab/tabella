import type { ObjectWithAttributes, TabellaRecord } from '@tabella/shared';

interface RecordTableProps {
  object: ObjectWithAttributes;
  records: TabellaRecord[];
  total?: number;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

const DISPLAY_LIMIT_COLUMNS = 7;

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toLocaleString() : String(value);
  }
  return String(value);
}

/**
 * Plain list for Cycle 3 — Cycle 4 replaces this with the virtualized grid
 * (windowed fetching lands with it; the data hooks above are shaped to survive).
 */
export function RecordTable({ object, records, total, isPending, isError, error }: RecordTableProps) {
  const columns = object.attributes.slice(0, DISPLAY_LIMIT_COLUMNS);

  if (isError) {
    return (
      <p className="status error" role="alert">
        Could not load records: {error?.message ?? 'unknown error'}
      </p>
    );
  }

  return (
    <section className="table-card" aria-label={`${object.name} records`}>
      <div className="table-head">
        <h2>{object.name}</h2>
        <span className="count">
          {isPending ? '…' : `${records.length} shown of ${total?.toLocaleString() ?? '—'}`}
        </span>
      </div>

      <div className="table-scroll">
        <table className="records">
          <thead>
            <tr>
              {columns.map((attr) => (
                <th key={attr.id}>{attr.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isPending && (
              <tr>
                <td colSpan={columns.length} className="status">
                  Loading records…
                </td>
              </tr>
            )}
            {!isPending &&
              records.map((record) => (
                <tr key={record.id}>
                  {columns.map((attr) => (
                    <td key={attr.id}>{formatCell(record.data[attr.key])}</td>
                  ))}
                </tr>
              ))}
            {!isPending && records.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="status">
                  No records match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
