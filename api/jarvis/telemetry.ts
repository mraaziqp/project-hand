import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { jarvisCoreUrl, authToken, state } = req.body;
  const startTime = Date.now();

  if (!jarvisCoreUrl) {
    return res.json({
      success: true,
      mode: 'autonomous',
      message: 'JARVIS // BENCH-OS running in autonomous offline edge mode.',
      latencyMs: 0,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'JARVIS-BENCH-OS/2.0',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(jarvisCoreUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source: 'BENCH-OS',
        timestamp: new Date().toISOString(),
        ...state,
      }),
    });

    const latencyMs = Date.now() - startTime;
    const data = await response.json().catch(() => ({}));

    return res.json({
      success: response.ok,
      status: response.status,
      latencyMs,
      data,
    });
  } catch (err: any) {
    return res.status(502).json({
      success: false,
      error: err.message || 'Failed to reach Jarvis Core backend URL',
      latencyMs: Date.now() - startTime,
    });
  }
}
