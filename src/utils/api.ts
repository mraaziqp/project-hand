import { getStoredSettings } from './storage';

/**
 * Where the API lives. The web app uses its own origin (''), while the Android
 * build is compiled with VITE_API_BASE pointing at the hosted server.
 */
export const DEFAULT_API_BASE: string = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

export function apiUrl(path: string): string {
  const base = getStoredSettings().apiBaseUrl || DEFAULT_API_BASE;
  return `${base}${path}`;
}

export class ApiRequestError extends Error {
  constructor(message: string, public status: number, public needsAccessKey = false) {
    super(message);
  }
}

/** POST JSON to the bench server, attaching the optional access key. */
export async function postJSON<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const { accessKey } = getStoredSettings();
  const url = apiUrl(path);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessKey) headers['x-bench-key'] = accessKey;

  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiRequestError(
      navigator.onLine ? `Could not reach the BENCH-OS server (${url.replace(/\/api.*$/, '') || 'this site'}).` : 'You are offline - scanning needs an internet connection.',
      0
    );
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && typeof data.error === 'string' && data.error) || `Server error (HTTP ${res.status})`;
    throw new ApiRequestError(message, res.status, !!data?.needsAccessKey);
  }
  return data as T;
}
