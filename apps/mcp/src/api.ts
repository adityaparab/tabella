import { API_URL } from './config.js';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`API ${status}: ${body.slice(0, 500)}`);
    this.name = 'ApiError';
  }
}

export async function api(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new ApiError(res.status, text);
  return text ? JSON.parse(text) : null;
}
