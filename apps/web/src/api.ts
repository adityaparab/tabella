import {
  listObjectsResponseSchema,
  listRecordsResponseSchema,
  type ListRecordsQuery,
  type ObjectWithAttributes,
  type TabellaRecord,
} from '@tabella/shared';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export async function fetchObjects(): Promise<ObjectWithAttributes[]> {
  const res = await fetch(`${API_URL}/api/objects`);
  if (!res.ok) throw new Error(`GET /api/objects failed: ${res.status}`);
  return listObjectsResponseSchema.parse(await res.json()).objects;
}

export type RecordPage = {
  records: TabellaRecord[];
  total: number;
  nextCursor: string | null;
};

export async function fetchRecords(
  slug: string,
  query: {
    filter?: ListRecordsQuery['filter'];
    sort?: ListRecordsQuery['sort'];
    limit?: number;
    cursor?: string;
  } = {},
): Promise<RecordPage> {
  const params = new URLSearchParams({ limit: String(query.limit ?? 50) });
  if (query.filter && query.filter.length > 0) params.set('filter', JSON.stringify(query.filter));
  if (query.sort && query.sort.length > 0) params.set('sort', JSON.stringify(query.sort));
  if (query.cursor) params.set('cursor', query.cursor);
  const res = await fetch(`${API_URL}/api/objects/${encodeURIComponent(slug)}/records?${params}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `GET records failed: ${res.status}`);
  }
  return listRecordsResponseSchema.parse(await res.json());
}

export const apiUrl = API_URL;
