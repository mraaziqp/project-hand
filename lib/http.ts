// Small HTTP helpers shared by server.ts and the Vercel functions.
import type { Request, Response } from 'express';
import { isAuthorized } from './analyze.js';

// The Android app (Capacitor) serves the UI from https://localhost and calls the
// hosted API cross-origin. Extra origins can be added with CORS_ORIGINS.
const ALLOWED_ORIGINS = new Set([
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
  ...(process.env.CORS_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
]);

/** Sets CORS headers. Returns true if the request was a preflight that has been answered. */
export function applyCors(req: Request, res: Response): boolean {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-bench-key');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

type Handler = (req: Request, res: Response) => unknown;

/** Wraps a Vercel function with CORS, method check and optional access-key auth. */
export function apiRoute(method: 'GET' | 'POST', handler: Handler, { auth = true } = {}): Handler {
  return async (req, res) => {
    if (applyCors(req, res)) return;
    if (req.method !== method) return res.status(405).json({ error: 'Method Not Allowed' });
    if (auth && !isAuthorized(req.headers['x-bench-key'])) {
      return res.status(401).json({ error: 'Access key required. Enter it in Settings.', needsAccessKey: true });
    }
    return handler(req, res);
  };
}
