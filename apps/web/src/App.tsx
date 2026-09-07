import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchObjects, fetchRecords } from './api.js';
import { RecordTable } from './RecordTable.js';

export function App() {
  const [slug, setSlug] = useState<string | null>(null);
  const objects = useQuery({ queryKey: ['objects'], queryFn: fetchObjects });
  const active = objects.data?.find((object) => object.slug === slug) ?? objects.data?.[0] ?? null;

  const records = useQuery({
    queryKey: ['records', active?.slug],
    queryFn: () => fetchRecords(active!.slug, { limit: 50 }),
    enabled: active !== null,
  });

  return (
    <div className="app">
      <header className="masthead">
        <h1>Tabella</h1>
        <p className="sub">Real-time collaborative data workspace</p>
      </header>

      {objects.isPending && <p className="status">Loading objects…</p>}
      {objects.isError && (
        <p className="status error" role="alert">
          Could not reach the API: {objects.error.message}
        </p>
      )}

      {objects.data && (
        <>
          <nav className="object-switcher" aria-label="Objects">
            {objects.data.map((object) => (
              <button
                key={object.slug}
                className={object.slug === active?.slug ? 'tab active' : 'tab'}
                onClick={() => setSlug(object.slug)}
              >
                {object.name}
              </button>
            ))}
          </nav>
          {active && (
            <RecordTable
              object={active}
              records={records.data?.records ?? []}
              total={records.data?.total}
              isPending={records.isPending}
              isError={records.isError}
              error={records.error}
            />
          )}
        </>
      )}
    </div>
  );
}
