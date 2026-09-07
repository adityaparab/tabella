import { useEffect, useState } from 'react';
import type { ObjectWithAttributes } from '@tabella/shared';
import { apiUrl, fetchObjects } from './api.js';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; objects: ObjectWithAttributes[] };

export function App() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    fetchObjects()
      .then((objects) => setState({ kind: 'ready', objects }))
      .catch((err: unknown) =>
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        }),
      );
  }, []);

  return (
    <main className="shell">
      <header className="masthead">
        <h1>
          Tabella <span className="tag">Cycle 1 — skeleton</span>
        </h1>
        <p className="sub">
          Real-time collaborative data workspace · API:{' '}
          <code>{apiUrl.replace(/^https?:\/\//, '')}</code>
        </p>
      </header>

      {state.kind === 'loading' && <p className="status">Loading objects…</p>}

      {state.kind === 'error' && (
        <p className="status error" role="alert">
          Could not reach the API: {state.message}
        </p>
      )}

      {state.kind === 'ready' && (
        <section className="object-card" aria-label="objects">
          <h2>{state.objects[0]?.name ?? 'No objects'}</h2>
          <p className="meta">
            {state.objects.length} object{state.objects.length === 1 ? '' : 's'} ·{' '}
            {state.objects[0]?.attributes.length ?? 0} attributes
          </p>
          <ul className="attributes">
            {state.objects[0]?.attributes.map((attr) => (
              <li key={attr.id}>
                <span className="attr-label">{attr.label}</span>
                <span className="attr-type">{attr.type}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
