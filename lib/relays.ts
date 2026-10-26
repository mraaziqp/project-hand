// Relay endpoints that forward bench data to the user's own Jarvis core / Agent Builder / NAS.
// Shared by server.ts and the Vercel functions in api/.
import { OUTBOUND_TIMEOUT_MS, parseOutboundUrl } from './analyze.js';

export interface RelayResult {
  status: number;
  body: Record<string, unknown>;
}

const DEFAULT_JARVIS_URL = 'https://jarvis.savestate.co.za';
const DEFAULT_JARVIS_KEY = 'jb_live_sk_4a99dd8421af3f23637a16b9f52b7c0c75ed44b5ab14f20e';
const DEFAULT_AGENT_BUILDER_URL = 'https://portfolio.arpcloudsolutions.co.za/api/agent-builder/bridge';
const DEFAULT_AGENT_BUILDER_KEY = 'jrv_12131e8a71fb40bc52af8e9bf16f866505e74231fe89f120';

function buildJarvisHeaders(authToken?: unknown): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'JARVIS-BENCH-OS/3.1',
  };
  const token =
    (typeof authToken === 'string' && authToken.trim()) ||
    process.env.JARVIS_API_KEY ||
    DEFAULT_JARVIS_KEY;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Jarvis-Api-Key'] = token;
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

  const rawUrl =
    (typeof jarvisCoreUrl === 'string' && jarvisCoreUrl.trim()) ||
    process.env.JARVIS_CORE_URL ||
    DEFAULT_JARVIS_URL;

  const url = parseOutboundUrl(rawUrl);
  if (!url) {
    return { status: 400, body: { success: false, error: 'Jarvis core URL must be a valid http(s) URL.' } };
  }

  // If pointing at bare origin, target the standard ecosystem ping endpoint
  const targetUrl =
    url.pathname === '/' || url.pathname === ''
      ? new URL('/api/ecosystem/integrations/ping', url.origin)
      : url;

  try {
    const isEcosystemPing = targetUrl.pathname.includes('/integrations/ping');
    const payload = isEcosystemPing
      ? {
          status: 'healthy',
          version: '3.1.0',
          metrics: {
            source: 'BENCH-OS',
            timestamp: new Date().toISOString(),
            ...(state || {}),
          },
        }
      : {
          source: 'BENCH-OS',
          timestamp: new Date().toISOString(),
          ...(state || {}),
        };

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: buildJarvisHeaders(authToken),
      body: JSON.stringify(payload),
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
        message: response.ok ? 'Telemetry received by Jarvis.' : `Jarvis core answered HTTP ${response.status}.`,
        error: response.ok ? undefined : (data?.error || `Jarvis core answered HTTP ${response.status}.`),
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
  const rawTarget =
    jarvisCoreUrl ||
    nasWebhookUrl ||
    process.env.JARVIS_CORE_URL ||
    DEFAULT_JARVIS_URL;

  const url = parseOutboundUrl(rawTarget);
  if (!url) return { status: 400, body: { success: false, error: 'No valid Jarvis core or NAS URL configured.' } };

  const targetUrl =
    url.pathname === '/' || url.pathname === ''
      ? new URL('/api/ecosystem/integrations/ping', url.origin)
      : url;

  const totalParts = Array.isArray(parts) ? parts.length : 0;
  const isEcosystemPing = targetUrl.pathname.includes('/integrations/ping');

  const payload = isEcosystemPing
    ? {
        status: 'healthy',
        version: '3.1.0',
        metrics: {
          event: 'INVENTORY_SYNC',
          totalParts,
          parts: Array.isArray(parts) ? parts : [],
          stats: stats || {},
        },
      }
    : {
        event: 'INVENTORY_SYNC',
        timestamp: new Date().toISOString(),
        totalParts,
        parts: Array.isArray(parts) ? parts : [],
        stats: stats || {},
      };

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: buildJarvisHeaders(authToken),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(OUTBOUND_TIMEOUT_MS),
    });
    return {
      status: 200,
      body: {
        success: response.ok,
        status: response.status,
        message: response.ok ? `Inventory synced (${totalParts} parts).` : `Sync failed (HTTP ${response.status}).`,
      },
    };
  } catch (err) {
    return { status: 502, body: { success: false, error: transportError(err, 'Inventory sync transport error.') } };
  }
}

export async function relayAgentBuilder(body: any): Promise<RelayResult> {
  const { agentBuilderUrl, apiKey, eventType = 'event', title, message, sender = 'BENCH-OS', metadata } = body || {};
  const startTime = Date.now();

  const targetUrl =
    (typeof agentBuilderUrl === 'string' && agentBuilderUrl.trim()) ||
    process.env.AGENT_BUILDER_URL ||
    DEFAULT_AGENT_BUILDER_URL;

  const token =
    (typeof apiKey === 'string' && apiKey.trim()) ||
    process.env.AGENT_BUILDER_KEY ||
    DEFAULT_AGENT_BUILDER_KEY;

  const url = parseOutboundUrl(targetUrl);
  if (!url) {
    return { status: 400, body: { success: false, error: 'Agent Builder bridge URL must be a valid http(s) URL.' } };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'JARVIS-BENCH-OS/3.1',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-jarvis-key'] = token;
    }

    const payload = {
      title: title || 'BENCH-OS Hardware Event',
      message: message || (metadata ? JSON.stringify(metadata) : 'Bench event dispatched to Agent Builder'),
      sender: sender || 'BENCH-OS',
      eventType: eventType === 'alert' ? 'alert' : 'event',
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
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
        message: response.ok ? 'Relayed event to Agent Builder.' : (data?.error || `Agent Builder answered HTTP ${response.status}`),
        error: response.ok ? undefined : (data?.error || `Agent Builder answered HTTP ${response.status}`),
      },
    };
  } catch (err) {
    return {
      status: 502,
      body: {
        success: false,
        error: transportError(err, 'Failed to reach Agent Builder bridge.'),
        latencyMs: Date.now() - startTime,
      },
    };
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
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'JARVIS-BENCH-OS/3.1',
      },
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
