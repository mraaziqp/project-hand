import { apiRoute } from '../lib/http.js';

export default apiRoute('GET', (_req, res) => res.json({ ok: true, geminiConfigured: !!process.env.GEMINI_API_KEY }), { auth: false });
