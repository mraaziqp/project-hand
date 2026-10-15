import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { webhookUrl, payload } = req.body;
  const startTime = Date.now();

  if (!webhookUrl) {
    return res.status(400).json({ error: 'Missing webhookUrl parameter.' });
  }

  try {
    const nasResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'JARVIS-BENCH-OS/2.0',
      },
      body: JSON.stringify({
        source: 'JARVIS // BENCH-OS',
        timestamp: new Date().toISOString(),
        ...payload,
      }),
    });

    const latencyMs = Date.now() - startTime;
    const statusText = await nasResponse.text().catch(() => '');

    return res.json({
      success: nasResponse.ok,
      status: nasResponse.status,
      latencyMs,
      response: statusText,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      latencyMs: Date.now() - startTime,
      error: err.message || 'Failed to reach home NAS webhook. Verify local network IP or port forward.',
    });
  }
}
