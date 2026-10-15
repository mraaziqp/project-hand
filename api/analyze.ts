import { AnalyzeError, analyzeImage } from '../lib/analyze.js';
import { apiRoute } from '../lib/http.js';

export default apiRoute('POST', async (req, res) => {
  try {
    return res.json(await analyzeImage(req.body || {}));
  } catch (err) {
    const status = err instanceof AnalyzeError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Vision analysis failed';
    console.error('[analyze] error:', message);
    return res.status(status).json({ error: message });
  }
});
