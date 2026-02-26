const activeWin = require('active-win');
const sharp = require('sharp');

function normalizeText(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/\.exe$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

class Tracker {
  constructor({
    syncEngine,
    powerMonitor,
    desktopCapturer,
    getSession,
    onStatus,
    allowedApps = [],
    blockedWindowKeywords = [],
    policyAlertCooldownMs = 5 * 60 * 1000,
    policyScreenshotCooldownMs = 60 * 1000
  }) {
    this.syncEngine = syncEngine;
    this.powerMonitor = powerMonitor;
    this.desktopCapturer = desktopCapturer;
    this.getSession = getSession;
    this.onStatus = onStatus;
    this.activityTimer = null;
    this.screenshotTimer = null;
    this.lastTick = Date.now();
    this.policyAlertCooldownMs = Math.max(30000, Number(policyAlertCooldownMs) || 5 * 60 * 1000);
    this.policyScreenshotCooldownMs = Math.max(10000, Number(policyScreenshotCooldownMs) || 60 * 1000);
    this.allowedAppTokens = Array.from(
      new Set((allowedApps || []).map(normalizeText).filter(Boolean))
    );
    this.blockedWindowKeywordTokens = Array.from(
      new Set((blockedWindowKeywords || []).map(normalizeText).filter(Boolean))
    );
    this.lastPolicyAlertByKey = new Map();
    this.lastPolicyScreenshotByKey = new Map();
    this.captureInFlight = false;
  }

  isAppAllowed(appName) {
    if (!this.allowedAppTokens.length) return true;
    const normalized = normalizeText(appName);
    if (!normalized || normalized === 'unknown') return true;
    return this.allowedAppTokens.some((allowed) => normalized === allowed || normalized.includes(allowed));
  }

  shouldTrigger(map, key, now, cooldownMs) {
    if (!key) return false;
    const lastAt = map.get(key) || 0;
    if (now - lastAt < cooldownMs) return false;
    map.set(key, now);
    return true;
  }

  detectPolicyViolation({ appName, windowTitle }) {
    const normalizedTitle = normalizeText(windowTitle);
    const matchedKeyword = this.blockedWindowKeywordTokens.find((kw) => normalizedTitle && normalizedTitle.includes(kw));
    if (matchedKeyword) {
      return {
        key: `keyword:${matchedKeyword}`,
        reason: `blocked_keyword:${matchedKeyword}`,
        appName
      };
    }

    if (!this.isAppAllowed(appName)) {
      const appKey = normalizeText(appName) || 'unknown';
      return {
        key: `app:${appKey}`,
        reason: 'disallowed_app',
        appName
      };
    }

    return null;
  }

  async handlePolicyViolation({ session, appName, windowTitle, activityType, now }) {
    if (activityType !== 'active') return;

    const violation = this.detectPolicyViolation({ appName, windowTitle });
    if (!violation) return;

    const canAlert = this.shouldTrigger(
      this.lastPolicyAlertByKey,
      violation.key,
      now,
      this.policyAlertCooldownMs
    );
    const canCapture = this.shouldTrigger(
      this.lastPolicyScreenshotByKey,
      violation.key,
      now,
      this.policyScreenshotCooldownMs
    );

    if (canAlert) {
      await this.syncEngine.sendPolicyAlert({
        deviceId: session.deviceId,
        appName: violation.appName,
        windowTitle: windowTitle ? `${windowTitle} [${violation.reason}]` : violation.reason,
        detectedAt: new Date(now).toISOString()
      });
    }

    if (canCapture) {
      await this.captureScreenshot();
    }
  }

  async collectActivity() {
    const session = await this.getSession();
    if (!session) return;
    const now = Date.now();
    const duration = Math.max(1, Math.floor((now - this.lastTick) / 1000));
    this.lastTick = now;

    let appName = 'unknown';
    let windowTitle = null;
    try {
      const win = await activeWin();
      appName = (win && win.owner && win.owner.name) || 'unknown';
      windowTitle = (win && win.title) || null;
    } catch {}

    const idle = this.powerMonitor.getSystemIdleTime();
    const activityType = idle >= 60 ? 'idle' : 'active';

    this.syncEngine.enqueue({
      ts: new Date(now).toISOString(),
      app_name: appName,
      window_title: windowTitle,
      activity_type: activityType,
      idle_seconds: idle,
      duration_seconds: duration,
      device_id: session.deviceId
    });

    this.handlePolicyViolation({
      session,
      appName,
      windowTitle,
      activityType,
      now
    }).catch(() => {});

    this.onStatus && this.onStatus({ tracking: true, idleSeconds: idle, appName });
  }

  async captureScreenshot() {
    const session = await this.getSession();
    if (!session) return;
    if (this.captureInFlight) return;

    this.captureInFlight = true;
    try {
      const sources = await this.desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });
      if (!sources.length) {
        throw new Error('No screen source available');
      }

      const rawPng = sources[0].thumbnail.toPNG();
      const compressed = await sharp(rawPng).jpeg({ quality: 60 }).toBuffer();
      await this.syncEngine.uploadScreenshot({
        buffer: compressed,
        capturedAt: new Date().toISOString()
      });
      this.onStatus && this.onStatus({ lastScreenshotAt: new Date().toISOString(), lastScreenshotError: null });
    } catch (err) {
      this.onStatus && this.onStatus({ lastScreenshotError: err?.message || 'Screenshot upload failed' });
    } finally {
      this.captureInFlight = false;
    }
  }

  start() {
    if (this.activityTimer) return;
    this.lastTick = Date.now();
    this.captureScreenshot();
    this.activityTimer = setInterval(() => this.collectActivity(), 10000);
    this.screenshotTimer = setInterval(() => this.captureScreenshot(), 15 * 60 * 1000);
    this.syncEngine.start();
    this.onStatus && this.onStatus({ tracking: true });
  }

  stop() {
    if (this.activityTimer) clearInterval(this.activityTimer);
    if (this.screenshotTimer) clearInterval(this.screenshotTimer);
    this.activityTimer = null;
    this.screenshotTimer = null;
    this.syncEngine.stop();
    this.onStatus && this.onStatus({ tracking: false });
  }
}

module.exports = { Tracker };
