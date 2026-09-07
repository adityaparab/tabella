/**
 * Latency bench for the records query engine over HTTP.
 *   BASE_URL=http://localhost:3001 pnpm --filter @tabella/server bench
 *   BASE_URL=https://<railway-server> N=200 pnpm --filter @tabella/server bench
 */
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';
const N = Number(process.env.N ?? 300);

interface Case {
  name: string;
  slug: string;
  filter?: { key: string; op: string; value: unknown }[];
  sort?: { key: string; dir: 'asc' | 'desc' }[];
}

const CASES: Case[] = [
  { name: 'deals: stage=Negotiation, value desc', slug: 'deals', filter: [{ key: 'stage', op: 'eq', value: 'Negotiation' }], sort: [{ key: 'value', dir: 'desc' }] },
  { name: 'deals: value>=50000, value desc', slug: 'deals', filter: [{ key: 'value', op: 'gte', value: 50000 }], sort: [{ key: 'value', dir: 'desc' }] },
  { name: 'companies: name asc (index scan)', slug: 'companies', sort: [{ key: 'name', dir: 'asc' }] },
  { name: 'people: recent activity, name asc', slug: 'people', filter: [{ key: 'last_activity', op: 'gte', value: '2026-06-01' }], sort: [{ key: 'name', dir: 'asc' }] },
  { name: 'deals: stage asc + value desc', slug: 'deals', sort: [{ key: 'stage', dir: 'asc' }, { key: 'value', dir: 'desc' }] },
];

function percentile(sorted: number[], p: number): number {
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)]!;
}

(async () => {
  const health = await fetch(`${BASE_URL}/api/health`).then((r) => r.json());
  console.log(`bench -> ${BASE_URL} (db: ${health.db})`);
  for (const testCase of CASES) {
    const q = new URLSearchParams({ limit: '50' });
    if (testCase.filter) q.set('filter', JSON.stringify(testCase.filter));
    if (testCase.sort) q.set('sort', JSON.stringify(testCase.sort));
    const url = `${BASE_URL}/api/objects/${testCase.slug}/records?${q}`;

    // warm-up (pool + planner)
    await fetch(url).then((r) => r.json());

    const samples: number[] = [];
    for (let i = 0; i < N; i++) {
      const started = performance.now();
      const res = await fetch(url);
      await res.json();
      if (!res.ok) throw new Error(`${res.status} on ${testCase.name}`);
      samples.push(performance.now() - started);
    }
    samples.sort((a, b) => a - b);
    console.log(
      `${testCase.name.padEnd(44)} p50=${percentile(samples, 50).toFixed(1)}ms  p95=${percentile(samples, 95).toFixed(1)}ms  p99=${percentile(samples, 99).toFixed(1)}ms`,
    );
  }
})();
