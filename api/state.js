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

function asState(value) {
  if (!value || !Array.isArray(value.logs) || typeof value.foundations !== 'object') return null;
  return value;
}

function rebuildFoundations(logs) {
  const foundations = {};
  [...logs]
    .sort((a, b) => `${a.date || ''}${a.createdAt || ''}`.localeCompare(`${b.date || ''}${b.createdAt || ''}`))
    .forEach(log => {
      const names = Array.isArray(log.foundationNames) ? log.foundationNames : [];
      names.forEach(name => {
        const key = String(name).trim().toLowerCase();
        if (!key) return;
        const old = foundations[key];
        foundations[key] = {
          name: String(name).trim(),
          ownerId: log.leaderId,
          zoneId: log.zoneId,
          stage: log.stage,
          progress: Number(log.progress || 0),
          firstDate: old?.firstDate || log.date,
          lastDate: log.date,
          updatedAt: log.createdAt || new Date().toISOString()
        };
      });
    });
  return foundations;
}

function mergeStates(current, incoming) {
  const now = new Date().toISOString();
  const deleted = new Set([
    ...(current?.syncMeta?.deletedLogIds || []),
    ...(incoming?.syncMeta?.deletedLogIds || [])
  ]);

  const byId = new Map();
  [...(current?.logs || []), ...(incoming?.logs || [])].forEach(log => {
    if (!log?.id || deleted.has(log.id)) return;
    const previous = byId.get(log.id);
    if (!previous || String(log.createdAt || '') >= String(previous.createdAt || '')) {
      byId.set(log.id, log);
    }
  });

  deleted.forEach(id => byId.delete(id));
  const logs = [...byId.values()].sort((a, b) => `${a.date || ''}${a.createdAt || ''}`.localeCompare(`${b.date || ''}${b.createdAt || ''}`));
  const revision = Math.max(Number(current?.syncMeta?.revision || 0), Number(incoming?.syncMeta?.revision || 0)) + 1;

  return {
    version: Math.max(Number(current?.version || 1), Number(incoming?.version || 1)),
    logs,
    foundations: rebuildFoundations(logs),
    createdAt: current?.createdAt || incoming?.createdAt || now,
    updatedAt: now,
    syncMeta: {
      revision,
      deletedLogIds: [...deleted].slice(-1500)
    }
  };
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
      const incoming = asState(JSON.parse(body));
      if (!incoming) {
        return res.status(400).json({ ok: false, error: 'Invalid TAILG state payload' });
      }

      const currentRaw = await redis(['GET', KEY]);
      const current = currentRaw ? asState(JSON.parse(currentRaw)) : null;
      const merged = mergeStates(current, incoming);
      await redis(['SET', KEY, JSON.stringify(merged)]);
      return res.status(200).json({ ok: true, state: merged });
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
