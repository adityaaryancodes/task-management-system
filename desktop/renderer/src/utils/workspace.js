import { WORKSPACE_STORAGE_KEY } from '../config/workspace';

export function formatDuration(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds) || 0);
  const hours = String(Math.floor(safe / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const seconds = String(Math.floor(safe % 60)).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function formatCompactDuration(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (!hours && !minutes) return `${safe}s`;
  if (!hours) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function formatRelativeTime(value, now) {
  if (!value) return 'Just now';
  const diffMs = Math.max(0, now - new Date(value).getTime());
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatClock(value) {
  if (!value) return 'Not yet';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function syncLabel(syncStatus) {
  if (syncStatus === 'connected') return 'Connected';
  if (syncStatus === 'syncing') return 'Syncing';
  if (syncStatus === 'offline') return 'Offline';
  if (syncStatus === 'paused') return 'Paused';
  return 'Idle';
}

export function normalizeAppName(appName) {
  return String(appName || 'No app detected').replace(/\.exe$/i, '').trim() || 'No app detected';
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\.exe$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isBrowserApp(appName) {
  const token = slugify(appName);
  return ['chrome', 'google chrome', 'brave', 'firefox', 'edge', 'msedge', 'opera'].some((browser) => token.includes(browser));
}

export function extractWebsiteSignal(appName, windowTitle) {
  if (!isBrowserApp(appName) || !windowTitle) return null;
  const parts = String(windowTitle)
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return 'Browser activity';

  const browserToken = slugify(appName);
  const candidates = parts.filter((part) => {
    const normalized = slugify(part);
    return normalized && normalized !== browserToken && !normalized.includes(browserToken);
  });

  const directUrl = candidates.find((part) => /\b[a-z0-9-]+\.[a-z]{2,}\b/i.test(part));
  if (directUrl) return directUrl;

  return candidates[candidates.length - 1] || parts[0] || 'Browser activity';
}

export function upsertUsage(list, label, seconds) {
  if (!label || !seconds) return list;
  const nextList = [...list];
  const index = nextList.findIndex((item) => item.label === label);
  if (index >= 0) {
    nextList[index] = { ...nextList[index], seconds: nextList[index].seconds + seconds };
  } else {
    nextList.push({ label, seconds });
  }
  return nextList
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 8);
}

export function deriveCurrentTask(tasks) {
  return tasks.find((task) => task.status === 'in_progress') || tasks.find((task) => task.status === 'todo') || null;
}

export function deriveProductivityScore(activeSecondsToday, idleSecondsToday, tasks) {
  const active = Math.max(0, Number(activeSecondsToday) || 0);
  const idle = Math.max(0, Number(idleSecondsToday) || 0);
  const tracked = Math.max(1, active + idle);
  const completionRate = tasks.length ? tasks.filter((task) => task.status === 'completed').length / tasks.length : 1;
  const activityRatio = active / tracked;
  return Math.round((activityRatio * 0.75 + completionRate * 0.25) * 100);
}

export function statusClassForTask(status) {
  if (status === 'completed') return 'status-positive';
  if (status === 'in_progress') return 'status-warning';
  return 'status-neutral';
}

export function statusClassForConnection(status) {
  if (status === 'connected') return 'status-positive';
  if (status === 'syncing' || status === 'paused') return 'status-warning';
  return 'status-neutral';
}

export function readPersistedWorkspace() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      activeView: typeof parsed.activeView === 'string' ? parsed.activeView : 'dashboard',
      proofName: typeof parsed.proofName === 'string' ? parsed.proofName : '',
      proofStatus: typeof parsed.proofStatus === 'string' ? parsed.proofStatus : '',
      activityFeed: Array.isArray(parsed.activityFeed) ? parsed.activityFeed.slice(0, 18) : [],
      appUsage: Array.isArray(parsed.appUsage) ? parsed.appUsage.slice(0, 8) : [],
      websiteUsage: Array.isArray(parsed.websiteUsage) ? parsed.websiteUsage.slice(0, 8) : [],
      screenshotFeed: Array.isArray(parsed.screenshotFeed) ? parsed.screenshotFeed.slice(0, 12) : []
    };
  } catch {
    return null;
  }
}

export function persistWorkspace(payload) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

export function clearPersistedWorkspace() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  } catch {}
}
