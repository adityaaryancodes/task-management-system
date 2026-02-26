import { WebSocketServer } from 'ws';
import { verifyAccessToken } from '../utils/tokens.js';

const adminRoles = new Set(['owner', 'manager']);
const clients = new Set();

function safeSend(ws, payload) {
  if (!ws || ws.readyState !== 1) return;
  try {
    ws.send(JSON.stringify(payload));
  } catch {}
}

export function initPolicyAlertsWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws/policy-alerts' });

  wss.on('connection', (ws, req) => {
    let payload;
    try {
      const parsed = new URL(req.url || '', 'http://localhost');
      const token = parsed.searchParams.get('token');
      const orgId = parsed.searchParams.get('org_id');
      if (!token) throw new Error('Missing token');

      payload = verifyAccessToken(token);
      if (orgId && payload.org_id !== orgId) throw new Error('Org mismatch');
      if (!adminRoles.has(payload.role)) throw new Error('Forbidden role');
    } catch {
      ws.close(1008, 'Unauthorized');
      return;
    }

    const client = {
      ws,
      orgId: payload.org_id,
      role: payload.role,
      userId: payload.sub
    };
    clients.add(client);

    safeSend(ws, { type: 'connected', data: { ok: true } });
    ws.on('close', () => clients.delete(client));
    ws.on('error', () => clients.delete(client));
  });

  return wss;
}

function broadcastToOrg(orgId, message) {
  for (const client of clients) {
    if (client.orgId !== orgId) continue;
    if (!adminRoles.has(client.role)) continue;
    safeSend(client.ws, message);
  }
}

export function publishPolicyAlertCreated(orgId, alert) {
  broadcastToOrg(orgId, { type: 'policy_alert_created', data: alert });
}

export function publishPolicyAlertResolved(orgId, alert) {
  broadcastToOrg(orgId, { type: 'policy_alert_resolved', data: alert });
}
