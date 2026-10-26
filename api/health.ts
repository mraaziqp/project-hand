import { apiRoute } from '../lib/http.js';
import { parseOutboundUrl } from '../lib/analyze.js';

export default apiRoute(
  'GET',
  async (req, res) => {
    const wantsProbe = req.query?.probe === '1';
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const jarvisUrl = process.env.JARVIS_CORE_URL || 'https://jarvis.savestate.co.za';
    const agentBuilderUrl =
      process.env.AGENT_BUILDER_URL || 'https://portfolio.arpcloudsolutions.co.za/api/agent-builder/bridge';

    let jarvisProbe: { ok: boolean; status?: number; latencyMs?: number; error?: string } | null = null;
    let agentBuilderProbe: { ok: boolean; status?: number; latencyMs?: number; error?: string } | null = null;

    if (wantsProbe) {
      const probeTarget = async (urlStr: string) => {
        const url = parseOutboundUrl(urlStr);
        if (!url) return { ok: false, error: 'Invalid URL' };
        const start = Date.now();
        try {
          const r = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(4000) });
          return { ok: r.ok || r.status < 500, status: r.status, latencyMs: Date.now() - start };
        } catch (err: any) {
          return { ok: false, error: err?.message || 'Unreachable', latencyMs: Date.now() - start };
        }
      };

      [jarvisProbe, agentBuilderProbe] = await Promise.all([
        probeTarget(jarvisUrl),
        probeTarget(agentBuilderUrl),
      ]);
    }

    return res.json({
      ok: true,
      version: '3.2.0',
      app: 'JARVIS // BENCH-OS',
      timestamp: new Date().toISOString(),
      connections: {
        gemini: { configured: hasGemini },
        jarvis: {
          configured: true,
          endpoint: jarvisUrl,
          ...(jarvisProbe ? { probe: jarvisProbe } : {}),
        },
        agentBuilder: {
          configured: true,
          endpoint: agentBuilderUrl,
          ...(agentBuilderProbe ? { probe: agentBuilderProbe } : {}),
        },
      },
    });
  },
  { auth: false }
);
