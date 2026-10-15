import { apiRoute } from '../../lib/http.js';
import { relayTelemetry } from '../../lib/relays.js';

export default apiRoute('POST', async (req, res) => {
  const result = await relayTelemetry(req.body);
  return res.status(result.status).json(result.body);
});
