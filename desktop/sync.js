const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

class SyncEngine {
  constructor({ apiBaseUrl, queuePath, getSession, setSession }) {
    this.apiBaseUrl = apiBaseUrl;
    this.queuePath = queuePath;
    this.getSession = getSession;
    this.setSession = setSession;
    this.timer = null;
  }

  async requestWithAuth(config) {
    const session = await this.getSession();
    if (!session) throw new Error('Not logged in');

    try {
      return await axios({
        timeout: 20000,
        ...config,
        headers: {
          ...(config.headers || {}),
          Authorization: `Bearer ${session.accessToken}`,
          'x-org-id': session.orgId
        }
      });
    } catch (err) {
      if (err?.response?.status === 401 && session.refreshToken) {
        const refresh = await axios.post(`${this.apiBaseUrl}/auth/refresh`, { refresh_token: session.refreshToken }, { timeout: 10000 });
        session.accessToken = refresh.data.access_token;
        if (this.setSession) await this.setSession(session);
        return axios({
          timeout: 20000,
          ...config,
          headers: {
            ...(config.headers || {}),
            Authorization: `Bearer ${session.accessToken}`,
            'x-org-id': session.orgId
          }
        });
      }
      throw err;
    }
  }

  ensureQueue() {
    if (!fs.existsSync(path.dirname(this.queuePath))) fs.mkdirSync(path.dirname(this.queuePath), { recursive: true });
    if (!fs.existsSync(this.queuePath)) fs.writeFileSync(this.queuePath, JSON.stringify({ events: [] }), 'utf-8');
  }

  enqueue(event) {
    this.ensureQueue();
    const data = JSON.parse(fs.readFileSync(this.queuePath, 'utf-8'));
    data.events.push(event);
    fs.writeFileSync(this.queuePath, JSON.stringify(data), 'utf-8');
  }

  dequeueBatch(limit = 300) {
    this.ensureQueue();
    const data = JSON.parse(fs.readFileSync(this.queuePath, 'utf-8'));
    const batch = data.events.slice(0, limit);
    data.events = data.events.slice(limit);
    fs.writeFileSync(this.queuePath, JSON.stringify(data), 'utf-8');
    return batch;
  }

  putBack(events) {
    if (!events.length) return;
    this.ensureQueue();
    const data = JSON.parse(fs.readFileSync(this.queuePath, 'utf-8'));
    data.events = [...events, ...data.events];
    fs.writeFileSync(this.queuePath, JSON.stringify(data), 'utf-8');
  }

  async flushActivity() {
    const session = await this.getSession();
    if (!session) return;
    const events = this.dequeueBatch(500);
    if (!events.length) return;
    try {
      await this.requestWithAuth({
        method: 'post',
        url: `${this.apiBaseUrl}/activity/batch`,
        data: { events }
      });
    } catch {
      this.putBack(events);
    }
  }

  async sendHeartbeat(metrics) {
    await this.requestWithAuth({
      method: 'post',
      url: `${this.apiBaseUrl}/device/heartbeat`,
      data: metrics
    });
  }

  async uploadScreenshot({ buffer, capturedAt }) {
    const session = await this.getSession();
    if (!session) return;
    const form = new FormData();
    form.append('captured_at', capturedAt);
    form.append('device_id', session.deviceId);
    form.append('screenshot', buffer, { filename: 'screen.jpg', contentType: 'image/jpeg' });

    await this.requestWithAuth({
      method: 'post',
      url: `${this.apiBaseUrl}/screenshots/upload`,
      data: form,
      headers: form.getHeaders(),
      maxBodyLength: 8 * 1024 * 1024
    });
  }

  async sendPolicyAlert({ deviceId, appName, windowTitle, detectedAt }) {
    const session = await this.getSession();
    if (!session) return;

    await this.requestWithAuth({
      method: 'post',
      url: `${this.apiBaseUrl}/policy/alerts`,
      data: {
        device_id: deviceId,
        app_name: appName,
        window_title: windowTitle || null,
        detected_at: detectedAt
      }
    });
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.flushActivity(), 60000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

module.exports = { SyncEngine };
