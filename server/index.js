import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number.parseInt(process.env.PORT ?? '5174', 10);

const users = [
  {
    email: 'admin@example.com',
    password: 'gnosis',
  },
];

const tokens = new Map();

const sendJson = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  res.end(JSON.stringify(payload));
};

const parseBody = (req) =>
  new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });

const getToken = (req) => {
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length).trim();
};

const server = createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.url === '/api/health' && req.method === 'GET') {
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  if (req.url === '/api/login' && req.method === 'POST') {
    const body = await parseBody(req);
    const user = users.find(
      (entry) => entry.email === body.email && entry.password === body.password,
    );
    if (!user) {
      sendJson(res, 401, { error: 'Invalid credentials' });
      return;
    }
    const token = randomUUID();
    tokens.set(token, { email: user.email, issuedAt: Date.now() });
    sendJson(res, 200, { token, user: { email: user.email } });
    return;
  }

  if (req.url === '/api/logout' && req.method === 'POST') {
    const token = getToken(req);
    if (token) {
      tokens.delete(token);
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.url === '/api/me' && req.method === 'GET') {
    const token = getToken(req);
    if (!token || !tokens.has(token)) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }
    sendJson(res, 200, { user: tokens.get(token) });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${PORT}`);
});
