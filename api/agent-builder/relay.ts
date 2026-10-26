import { apiRoute } from '../../lib/http.js';
import { relayAgentBuilder } from '../../lib/relays.js';

export default apiRoute('POST', async (req, res) => {
  const result = await relayAgentBuilder(req.body);
  return res.status(result.status).json(result.body);
});
