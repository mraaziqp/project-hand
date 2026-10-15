import { apiRoute } from '../../lib/http.js';
import { relayInventorySync } from '../../lib/relays.js';

export default apiRoute('POST', async (req, res) => {
  const result = await relayInventorySync(req.body);
  return res.status(result.status).json(result.body);
});
