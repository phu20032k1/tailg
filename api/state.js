const KEY = 'tailg:foundation:v1';

function config() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

async function redis(command) {
  const { url, token } = config();
  if (!url || !token) {
    const error = new Error('Cloud database is not configured');
    error.code = 'NOT_CONFIGURED';
    throw error;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  if (!response.ok) throw new Error(`Redis request failed: ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    if (req.method === 'GET') {
      const raw = await redis(['GET', KEY]);
      const state = raw ? JSON.parse(raw) : null;
      return res.status(200).json({ ok: true, state });
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const state = JSON.parse(body);
      if (!state || !Array.isArray(state.logs) || typeof state.foundations !== 'object') {
        return res.status(400).json({ ok: false, error: 'Invalid TAILG state payload' });
      }
      await redis(['SET', KEY, JSON.stringify(state)]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error) {
    if (error.code === 'NOT_CONFIGURED') {
      return res.status(503).json({ ok: false, mode: 'local', error: 'Redis not configured' });
    }
    return res.status(500).json({ ok: false, error: error.message || 'Internal error' });
  }
}
