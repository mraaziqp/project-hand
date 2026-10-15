import { apiRoute } from '../../lib/http.js';
import { relayNas } from '../../lib/relays.js';

export default apiRoute('POST', async (req, res) => {
  const result = await relayNas(req.body);
  return res.status(result.status).json(result.body);
});
