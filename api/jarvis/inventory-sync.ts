import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { jarvisCoreUrl, nasWebhookUrl, authToken, parts, stats } = req.body;
  const targetUrl = jarvisCoreUrl || nasWebhookUrl;

  if (!targetUrl) {
    return res.status(400).json({ error: 'No Jarvis Core or NAS URL configured.' });
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'JARVIS-BENCH-OS/2.0',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event: 'INVENTORY_SYNC',
        timestamp: new Date().toISOString(),
        totalParts: parts?.length || 0,
        parts: parts || [],
        stats: stats || {},
      }),
    });

    return res.json({
      success: response.ok,
      status: response.status,
      message: response.ok ? 'Inventory sync committed to Second Brain.' : 'Sync failed.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Inventory sync transport error.',
    });
  }
}
