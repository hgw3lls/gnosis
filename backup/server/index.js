import { createServer } from 'node:http';
const PORT = Number.parseInt(process.env.PORT ?? '5174', 10);

const adminUser = { email: 'admin@example.com', role: 'admin' };

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

const server = createServer(async (req, res) => {
  try {
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

    if (req.url === '/api/login') {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
      }
      await parseBody(req);
      sendJson(res, 200, { token: 'admin', user: adminUser });
      return;
    }

    if (req.url === '/api/logout' && req.method === 'POST') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.url === '/api/me' && req.method === 'GET') {
      sendJson(res, 200, { user: adminUser });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Backend error', error);
    sendJson(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${PORT}`);
});
