import { appendFileSync } from 'node:fs';
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

/**
 * Debug aid: set TABELLA_MCP_LOG to a path and every API call this server makes is
 * appended there (ISO time, method, path, status). Lets a human verify what the MCP
 * host's model actually called — handy for demos and gate checks.
 */
function logCall(method: string, path: string, status: number, ms: number): void {
  if (!process.env.TABELLA_MCP_LOG) return;
  try {
    appendFileSync(
      process.env.TABELLA_MCP_LOG,
      `${new Date().toISOString()} ${method} ${path} -> ${status} (${ms.toFixed(0)}ms)\n`,
    );
  } catch {
    // logging must never break the server
  }
}

export async function api(path: string, init?: RequestInit): Promise<unknown> {
  const started = performance.now();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  logCall(init?.method ?? 'GET', path, res.status, performance.now() - started);
  const text = await res.text();
  if (!res.ok) throw new ApiError(res.status, text);
  return text ? JSON.parse(text) : null;
}
