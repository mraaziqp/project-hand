import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { AnalyzeError, analyzeImage, isAuthorized } from './lib/analyze.js';
import { relayInventorySync, relayNas, relayTelemetry, relayAgentBuilder, RelayResult } from './lib/relays.js';
import { applyCors } from './lib/http.js';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Phone photos are downscaled client-side to ~1600px, so a few MB is plenty.
app.use(express.json({ limit: '12mb' }));

app.use('/api', (req, res, next) => {
  if (applyCors(req, res)) return;
  if (req.path === '/health') return next();
  if (!isAuthorized(req.header('x-bench-key'))) {
    return res.status(401).json({ error: 'Access key required. Enter it in Settings.', needsAccessKey: true });
  }
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, geminiConfigured: !!process.env.GEMINI_API_KEY });
});

app.post('/api/analyze', async (req, res) => {
  try {
    const result = await analyzeImage(req.body || {});
    return res.json(result);
  } catch (err) {
    const status = err instanceof AnalyzeError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Vision analysis failed';
    console.error('[analyze] error:', message);
    return res.status(status).json({ error: message });
  }
});

const sendRelay = (fn: (body: unknown) => Promise<RelayResult>) => async (req: express.Request, res: express.Response) => {
  const result = await fn(req.body);
  res.status(result.status).json(result.body);
};

app.post('/api/jarvis/telemetry', sendRelay(relayTelemetry));
app.post('/api/jarvis/inventory-sync', sendRelay(relayInventorySync));
app.post('/api/agent-builder/relay', sendRelay(relayAgentBuilder));
app.post('/api/nas/proxy', sendRelay(relayNas));
app.post('/api/nas-sync', sendRelay(relayNas)); // backward-compatibility

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Unknown API route.' });
});

// Full-stack Vite dev middleware vs production static serving
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const dist = path.resolve(__dirname, 'dist');
    app.use(express.static(dist, { index: false, maxAge: '1h', setHeaders: (res, file) => {
      // Never cache the service worker or HTML so updates roll out immediately.
      if (file.endsWith('sw.js') || file.endsWith('.html') || file.endsWith('.webmanifest')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    } }));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BENCH-OS] ${isProduction ? 'production' : 'dev'} server on http://localhost:${PORT}`);
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[BENCH-OS] WARNING: GEMINI_API_KEY is not set - scans will fail until you add it to .env');
    }
    if (process.env.APP_ACCESS_KEY) console.log('[BENCH-OS] API protected by APP_ACCESS_KEY');
  });
}

startServer();
