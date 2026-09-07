import { listObjectsResponseSchema, type ObjectWithAttributes } from '@tabella/shared';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export async function fetchObjects(): Promise<ObjectWithAttributes[]> {
  const res = await fetch(`${API_URL}/api/objects`);
  if (!res.ok) {
    throw new Error(`GET /api/objects failed with ${res.status}`);
  }
  return listObjectsResponseSchema.parse(await res.json()).objects;
}

export const apiUrl = API_URL;
