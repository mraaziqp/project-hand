// Relay endpoints that forward bench data to the user's own Jarvis core / NAS.
// Shared by server.ts and the Vercel functions in api/.
import { OUTBOUND_TIMEOUT_MS, parseOutboundUrl } from './analyze.js';

export interface RelayResult {
  status: number;
  body: Record<string, unknown>;
}

function buildHeaders(authToken?: unknown): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'JARVIS-BENCH-OS/3.0',
  };
  if (typeof authToken === 'string' && authToken.trim()) {
    headers['Authorization'] = `Bearer ${authToken.trim()}`;
  }
  return headers;
}

function transportError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    if (err.name === 'TimeoutError') return `Timed out after ${OUTBOUND_TIMEOUT_MS / 1000}s. ${fallback}`;
    return err.message || fallback;
  }
  return fallback;
}

export async function relayTelemetry(body: any): Promise<RelayResult> {
  const { jarvisCoreUrl, authToken, state } = body || {};
  const startTime = Date.now();

  if (!jarvisCoreUrl) {
    return {
      status: 200,
      body: {
        success: true,
        mode: 'autonomous',
        message: 'No Jarvis core URL configured - running standalone.',
        latencyMs: 0,
        timestamp: new Date().toISOString(),
      },
    };
  }

  const url = parseOutboundUrl(jarvisCoreUrl);
  if (!url) return { status: 400, body: { success: false, error: 'Jarvis core URL must be a valid http(s) URL.' } };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(authToken),
      body: JSON.stringify({ source: 'BENCH-OS', timestamp: new Date().toISOString(), ...(state || {}) }),
      signal: AbortSignal.timeout(OUTBOUND_TIMEOUT_MS),
    });
    const data = await response.json().catch(() => ({}));
    return {
      status: 200,
      body: {
        success: response.ok,
        status: response.status,
        latencyMs: Date.now() - startTime,
        data,
        error: response.ok ? undefined : `Jarvis core answered HTTP ${response.status}.`,
      },
    };
  } catch (err) {
    return {
      status: 502,
      body: {
        success: false,
        error: transportError(err, 'Failed to reach the Jarvis core URL.'),
        latencyMs: Date.now() - startTime,
      },
    };
  }
}

export async function relayInventorySync(body: any): Promise<RelayResult> {
  const { jarvisCoreUrl, nasWebhookUrl, authToken, parts, stats } = body || {};
  const url = parseOutboundUrl(jarvisCoreUrl) || parseOutboundUrl(nasWebhookUrl);
  if (!url) return { status: 400, body: { success: false, error: 'No valid Jarvis core or NAS URL configured.' } };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(authToken),
      body: JSON.stringify({
        event: 'INVENTORY_SYNC',
        timestamp: new Date().toISOString(),
        totalParts: Array.isArray(parts) ? parts.length : 0,
        parts: Array.isArray(parts) ? parts : [],
        stats: stats || {},
      }),
      signal: AbortSignal.timeout(OUTBOUND_TIMEOUT_MS),
    });
    return {
      status: 200,
      body: {
        success: response.ok,
        status: response.status,
        message: response.ok ? 'Inventory synced.' : `Sync failed (HTTP ${response.status}).`,
      },
    };
  } catch (err) {
    return { status: 502, body: { success: false, error: transportError(err, 'Inventory sync transport error.') } };
  }
}

export async function relayNas(body: any): Promise<RelayResult> {
  const { webhookUrl, payload } = body || {};
  const startTime = Date.now();
  const url = parseOutboundUrl(webhookUrl);
  if (!url) return { status: 400, body: { success: false, error: 'webhookUrl must be a valid http(s) URL.' } };

  try {
    const nasResponse = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ source: 'JARVIS // BENCH-OS', timestamp: new Date().toISOString(), ...(payload || {}) }),
      signal: AbortSignal.timeout(OUTBOUND_TIMEOUT_MS),
    });
    const text = await nasResponse.text().catch(() => '');
    return {
      status: 200,
      body: {
        success: nasResponse.ok,
        status: nasResponse.status,
        latencyMs: Date.now() - startTime,
        response: text.slice(0, 2000),
      },
    };
  } catch (err) {
    return {
      status: 502,
      body: {
        success: false,
        latencyMs: Date.now() - startTime,
        error: transportError(err, 'Failed to reach the NAS webhook. Check the LAN/Tailscale IP and port.'),
      },
    };
  }
}
