const path = require('path');
const fs = require('fs');
const os = require('os');
const { app, BrowserWindow, Tray, Menu, ipcMain, powerMonitor, desktopCapturer } = require('electron');
const log = require('electron-log');
const keytar = require('keytar');
const axios = require('axios');
const AutoLaunch = require('auto-launch');
const { v4: uuidv4 } = require('uuid');
const { SyncEngine } = require('./sync');
const { Tracker } = require('./tracker');

const SERVICE = 'HybridWorkforceAgent';
const ACCOUNT = 'session';
const configPath = path.join(__dirname, 'agent.config.json');

function loadAppConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {}
  return {};
}

const appConfig = loadAppConfig();
const API_BASE_URL = (process.env.API_BASE_URL || appConfig.apiBaseUrl || 'https://task-management-system-1-jsam.onrender.com').replace(/\/+$/, '');
const DESKTOP_UI_URL = process.env.DESKTOP_UI_URL || appConfig.desktopUiUrl || 'http://localhost:5174';
const queuePath = path.join(app.getPath('userData'), 'queue.json');
const devicePath = path.join(app.getPath('userData'), 'device.json');
const DEFAULT_ALLOWED_APPS = ['visual studio code', 'code', 'google chrome', 'chrome', 'canva'];
const DEFAULT_BLOCKED_WINDOW_KEYWORDS = ['youtube', 'whatsapp'];

function parseAllowedApps() {
  const raw = process.env.ALLOWED_APPS;
  if (raw && typeof raw === 'string') {
    return raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  if (Array.isArray(appConfig.allowedApps) && appConfig.allowedApps.length) {
    return appConfig.allowedApps.map((v) => String(v).trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_APPS;
}

function parseBlockedWindowKeywords() {
  const raw = process.env.BLOCKED_WINDOW_KEYWORDS;
  if (raw && typeof raw === 'string') {
    return raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  if (Array.isArray(appConfig.blockedWindowKeywords) && appConfig.blockedWindowKeywords.length) {
    return appConfig.blockedWindowKeywords.map((v) => String(v).trim()).filter(Boolean);
  }
  return DEFAULT_BLOCKED_WINDOW_KEYWORDS;
}

function parsePolicyAlertCooldownMs() {
  const raw = Number(process.env.POLICY_ALERT_COOLDOWN_SECONDS || appConfig.policyAlertCooldownSeconds || 300);
  if (!Number.isFinite(raw) || raw <= 0) return 5 * 60 * 1000;
  return raw * 1000;
}

function parsePolicyScreenshotCooldownMs() {
  const raw = Number(process.env.POLICY_SCREENSHOT_COOLDOWN_SECONDS || appConfig.policyScreenshotCooldownSeconds || 60);
  if (!Number.isFinite(raw) || raw <= 0) return 60 * 1000;
  return raw * 1000;
}

let win;
let tray;
let state = { tracking: false, loggedIn: false, orgId: null, user: null, deviceId: null };
let currentAttendanceId = null;

async function loadDeviceIdentifier() {
  if (fs.existsSync(devicePath)) return JSON.parse(fs.readFileSync(devicePath, 'utf-8')).deviceIdentifier;
  const deviceIdentifier = `${os.hostname()}-${uuidv4()}`;
  fs.writeFileSync(devicePath, JSON.stringify({ deviceIdentifier }), 'utf-8');
  return deviceIdentifier;
}

async function getSession() {
  const raw = await keytar.getPassword(SERVICE, ACCOUNT);
  return raw ? JSON.parse(raw) : null;
}

async function setSession(session) {
  await keytar.setPassword(SERVICE, ACCOUNT, JSON.stringify(session));
}

async function clearSession() {
  await keytar.deletePassword(SERVICE, ACCOUNT);
}

async function refreshAccessToken(session) {
  const res = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    { refresh_token: session.refreshToken },
    { timeout: 10000 }
  );
  session.accessToken = res.data.access_token;
  await setSession(session);
  return session;
}

async function apiRequest(config) {
  const session = await getSession();
  if (!session) throw new Error('Not logged in');

  try {
    return await axios({
      timeout: 15000,
      ...config,
      headers: {
        ...(config.headers || {}),
        Authorization: `Bearer ${session.accessToken}`,
        'x-org-id': session.orgId
      }
    });
  } catch (err) {
    if (err?.response?.status === 401 && session.refreshToken) {
      const refreshed = await refreshAccessToken(session);
      return axios({
        timeout: 15000,
        ...config,
        headers: {
          ...(config.headers || {}),
          Authorization: `Bearer ${refreshed.accessToken}`,
          'x-org-id': refreshed.orgId
        }
      });
    }
    throw err;
  }
}

async function restoreSessionState() {
  const session = await getSession();
  if (!session) return;
  state = {
    ...state,
    loggedIn: true,
    orgId: session.orgId,
    user: session.user,
    deviceId: session.deviceId
  };
  if (session.user?.role === 'employee') {
    tracker.start();
    state.tracking = true;
    await ensureAttendanceLogin();
  }
  updateRenderer();
}

async function ensureAttendanceLogin() {
  const session = await getSession();
  if (!session || !session.deviceId) return;
  try {
    const res = await apiRequest({
      method: 'post',
      url: `${API_BASE_URL}/attendance/login`,
      data: { device_id: session.deviceId }
    });
    currentAttendanceId = res?.data?.id || currentAttendanceId;
  } catch (err) {
    if (err?.response?.status !== 409) {
      log.error('Attendance login failed', err?.response?.data || err.message);
    }
  }
}

async function ensureAttendanceLogout() {
  if (!currentAttendanceId) return;
  try {
    await apiRequest({
      method: 'post',
      url: `${API_BASE_URL}/attendance/logout`,
      data: { attendance_id: currentAttendanceId }
    });
    currentAttendanceId = null;
  } catch (err) {
    log.error('Attendance logout failed', err?.response?.data || err.message);
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 980,
    height: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const indexPath = path.join(__dirname, 'renderer', 'dist', 'index.html');
  win.webContents.on('did-fail-load', (_, code, desc, validatedUrl) => {
    log.error(`Renderer failed to load: code=${code} url=${validatedUrl} desc=${desc}`);
  });

  if (fs.existsSync(indexPath)) {
    win.loadFile(indexPath).catch((err) => log.error('Failed to load packaged renderer', err));
  } else {
    win.loadURL(DESKTOP_UI_URL).catch((err) => log.error('Failed to load dev renderer URL', err));
  }
}

function updateRenderer() {
  if (win) win.webContents.send('agent:status-update', state);
}

function createTray() {
  const trayIcon = path.join(__dirname, 'assets', 'tray.ico');
  if (!fs.existsSync(trayIcon)) return;

  tray = new Tray(trayIcon);
  tray.setToolTip('Hybrid Workforce Agent');
  const menu = Menu.buildFromTemplate([
    { label: 'Open', click: () => win && win.show() },
    { label: 'Tracking Active', enabled: false },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => win && win.show());
}

const syncEngine = new SyncEngine({ apiBaseUrl: API_BASE_URL, queuePath, getSession, setSession });
const tracker = new Tracker({
  syncEngine,
  powerMonitor,
  desktopCapturer,
  getSession,
  allowedApps: parseAllowedApps(),
  blockedWindowKeywords: parseBlockedWindowKeywords(),
  policyAlertCooldownMs: parsePolicyAlertCooldownMs(),
  policyScreenshotCooldownMs: parsePolicyScreenshotCooldownMs(),
  onStatus: (partial) => {
    state = { ...state, ...partial };
    updateRenderer();
  }
});

ipcMain.handle('agent:login', async (_, payload) => {
  const deviceIdentifier = await loadDeviceIdentifier();
  const result = await axios.post(`${API_BASE_URL}/auth/login`, {
    email: payload.email,
    password: payload.password,
    device_identifier: deviceIdentifier,
    device_name: os.hostname(),
    os_version: os.release()
  });

  const session = {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    orgId: result.data.user.org_id,
    user: result.data.user,
    deviceId: null
  };

  const jwtPayload = JSON.parse(Buffer.from(session.accessToken.split('.')[1], 'base64').toString('utf-8'));
  session.deviceId = jwtPayload.device_id;

  await setSession(session);
  state = { ...state, loggedIn: true, orgId: session.orgId, user: session.user, deviceId: session.deviceId };
  if (session.user?.role === 'employee') {
    tracker.start();
    state.tracking = true;
    await ensureAttendanceLogin();
  }
  updateRenderer();
  return { ok: true, state };
});

ipcMain.handle('agent:logout', async () => {
  tracker.stop();
  await ensureAttendanceLogout();
  await clearSession();
  state = { tracking: false, loggedIn: false, orgId: null, user: null, deviceId: null };
  updateRenderer();
  return { ok: true };
});

ipcMain.handle('agent:start', async () => {
  tracker.start();
  await ensureAttendanceLogin();
  state = { ...state, tracking: true };
  updateRenderer();
  return { ok: true, state };
});

ipcMain.handle('agent:stop', async () => {
  tracker.stop();
  await ensureAttendanceLogout();
  state = { ...state, tracking: false };
  updateRenderer();
  return { ok: true, state };
});

ipcMain.handle('agent:status', async () => {
  const session = await getSession();
  if (session && !state.loggedIn) {
    state = { ...state, loggedIn: true, orgId: session.orgId, user: session.user, deviceId: session.deviceId };
    if (session.user?.role === 'employee') {
      tracker.start();
      state.tracking = true;
    }
  }
  return state;
});

ipcMain.handle('agent:getTasks', async () => {
  try {
    const res = await apiRequest({
      method: 'get',
      url: `${API_BASE_URL}/tasks`,
      params: { page: 1, limit: 200 }
    });
    return { ok: true, data: res.data.data || [] };
  } catch (err) {
    return { ok: false, message: err?.response?.data?.message || err.message };
  }
});

ipcMain.handle('agent:updateTask', async (_, payload) => {
  try {
    const res = await apiRequest({
      method: 'patch',
      url: `${API_BASE_URL}/tasks/${payload.taskId}`,
      data: { status: payload.status }
    });
    return { ok: true, data: res.data };
  } catch (err) {
    return { ok: false, message: err?.response?.data?.message || err.message };
  }
});

app.whenReady().then(async () => {
  const autoLauncher = new AutoLaunch({ name: 'HybridWorkforceAgent' });
  try {
    if (!(await autoLauncher.isEnabled())) await autoLauncher.enable();
  } catch (err) {
    log.error('Auto-launch setup failed', err);
  }

  createWindow();
  createTray();
  await restoreSessionState();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
