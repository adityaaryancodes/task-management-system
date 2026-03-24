import { useEffect, useMemo, useState } from 'react';
import { agentClient } from '../api/agentClient';
import { getVisibleNavItems, VIEW_META } from '../config/workspace';
import {
  clearPersistedWorkspace,
  deriveCurrentTask,
  deriveProductivityScore,
  extractWebsiteSignal,
  formatDuration,
  normalizeAppName,
  persistWorkspace,
  readPersistedWorkspace,
  syncLabel,
  upsertUsage
} from '../utils/workspace';

const INITIAL_STATUS = { tracking: false, loggedIn: false, user: null };

export function useWorkspaceState() {
  const persisted = useMemo(() => readPersistedWorkspace(), []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [tasks, setTasks] = useState([]);
  const [taskError, setTaskError] = useState('');
  const [tasksLoading, setTasksLoading] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState('');
  const [now, setNow] = useState(Date.now());
  const [proofName, setProofName] = useState(persisted?.proofName || '');
  const [proofStatus, setProofStatus] = useState(persisted?.proofStatus || '');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [activeView, setActiveView] = useState(persisted?.activeView || 'dashboard');
  const [activityFeed, setActivityFeed] = useState(persisted?.activityFeed || []);
  const [appUsage, setAppUsage] = useState(persisted?.appUsage || []);
  const [websiteUsage, setWebsiteUsage] = useState(persisted?.websiteUsage || []);
  const [screenshotFeed, setScreenshotFeed] = useState(persisted?.screenshotFeed || []);

  const isEmployee = useMemo(() => status.user?.role === 'employee', [status.user]);
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const inProgressTasks = tasks.filter((task) => task.status === 'in_progress').length;
  const currentTask = deriveCurrentTask(tasks);
  const currentFocusSource = status.focusAppName || status.appName;
  const currentFocusTitle = status.focusWindowTitle || status.currentWindowTitle;
  const currentFocus = normalizeAppName(currentFocusSource);
  const websiteSignal = extractWebsiteSignal(currentFocusSource, currentFocusTitle);
  const activeSecondsToday = Math.max(0, Number(status.activeSecondsToday) || 0);
  const idleSecondsToday = Math.max(0, Number(status.idleSecondsToday) || 0);
  const trackedSecondsToday = activeSecondsToday + idleSecondsToday;
  const workTimer = status.workSessionStartedAt ? formatDuration((now - new Date(status.workSessionStartedAt).getTime()) / 1000) : '00:00:00';
  const productivityScore = deriveProductivityScore(activeSecondsToday, idleSecondsToday, tasks);
  const activeRatio = trackedSecondsToday ? Math.round((activeSecondsToday / trackedSecondsToday) * 100) : 0;
  const taskCompletionRatio = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const syncStateLabel = syncLabel(status.syncStatus);
  const visibleNavItems = useMemo(() => getVisibleNavItems(isEmployee), [isEmployee]);
  const currentView = VIEW_META[activeView] || VIEW_META.dashboard;
  const lastScreenshotState = status.lastScreenshotError ? 'Needs attention' : status.lastScreenshotAt ? 'Healthy' : 'Waiting';
  const todayLabel = new Date(now).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  const actionStatusLabel = status.tracking ? 'Tracking Active' : status.breakActive ? 'On Break' : 'Tracking Stopped';
  const canToggleBreak = status.tracking || status.breakActive;

  async function loadTasks(silent = false, roleOverride = status.user?.role) {
    if (roleOverride !== 'employee') return;
    if (!silent) setTasksLoading(true);
    setTaskError('');
    try {
      const res = await agentClient.getTasks();
      if (res.ok) {
        setTasks(res.data || []);
      } else {
        setTaskError(res.message || 'Failed to load tasks');
      }
    } catch {
      setTaskError('Failed to load tasks');
    } finally {
      if (!silent) setTasksLoading(false);
    }
  }

  useEffect(() => {
    agentClient.getStatus().then((next) => {
      setStatus(next);
    });

    const unsubscribe = agentClient.subscribeStatus((next) => {
      setStatus(next);
      if (!next.loggedIn) {
        setTasks([]);
        setTaskError('');
        setProofName('');
        setProofStatus('');
        setSettingsMessage('');
        setActiveView('dashboard');
        setActivityFeed([]);
        setAppUsage([]);
        setWebsiteUsage([]);
        setScreenshotFeed([]);
        clearPersistedWorkspace();
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (status.loggedIn && isEmployee) {
      loadTasks();
      const intervalId = setInterval(() => loadTasks(true), 45000);
      return () => clearInterval(intervalId);
    }
  }, [status.loggedIn, isEmployee]);

  useEffect(() => {
    if (!status.loggedIn) {
      return;
    }

    if (!visibleNavItems.some((item) => item.id === activeView)) {
      setActiveView('dashboard');
    }
  }, [status.loggedIn, visibleNavItems, activeView]);

  useEffect(() => {
    if (!status.loggedIn || !status.lastActivityAt) {
      return;
    }

    const entry = {
      id: `${status.lastActivityAt}-${status.appName || 'unknown'}-${status.activityType || 'neutral'}`,
      at: status.lastActivityAt,
      badge: status.activityType === 'active' ? 'Active' : status.activityType === 'idle' ? 'Idle' : 'Stopped',
      tone: status.activityType === 'active' ? 'status-positive' : status.activityType === 'idle' ? 'status-warning' : 'status-neutral',
      title: normalizeAppName(status.appName),
      subtitle:
        status.currentWindowTitle || extractWebsiteSignal(status.appName, status.currentWindowTitle) || 'Waiting for a foreground window title'
    };

    setActivityFeed((prev) => {
      if (prev[0]?.id === entry.id) return prev;
      return [entry, ...prev].slice(0, 18);
    });

    const activitySeconds = Math.max(0, Number(status.lastDurationSeconds) || 10);
    setAppUsage((prev) => upsertUsage(prev, normalizeAppName(status.appName), activitySeconds));

    const siteSignal = extractWebsiteSignal(status.appName, status.currentWindowTitle);
    if (siteSignal && status.activityType === 'active') {
      setWebsiteUsage((prev) => upsertUsage(prev, siteSignal, activitySeconds));
    }
  }, [
    status.loggedIn,
    status.lastActivityAt,
    status.lastDurationSeconds,
    status.appName,
    status.currentWindowTitle,
    status.activityType
  ]);

  useEffect(() => {
    if (!status.lastScreenshotAt) {
      return;
    }

    setScreenshotFeed((prev) => {
      if (prev[0]?.id === status.lastScreenshotAt) return prev;
      return [
        {
          id: status.lastScreenshotAt,
          at: status.lastScreenshotAt,
          error: status.lastScreenshotError || ''
        },
        ...prev
      ].slice(0, 12);
    });
  }, [status.lastScreenshotAt, status.lastScreenshotError]);

  useEffect(() => {
    if (!status.loggedIn) {
      return;
    }

    persistWorkspace({
      activeView,
      proofName,
      proofStatus,
      activityFeed,
      appUsage,
      websiteUsage,
      screenshotFeed
    });
  }, [status.loggedIn, activeView, proofName, proofStatus, activityFeed, appUsage, websiteUsage, screenshotFeed]);

  async function login(event) {
    event.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
      const res = await agentClient.login({ email, password });
      setStatus(res.state);
      if (res.state?.user?.role === 'employee') {
        await loadTasks(false, res.state?.user?.role);
      }
    } catch (err) {
      setLoginError(err?.message || 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

  async function updateTaskStatus(taskId, nextStatus) {
    setUpdatingTaskId(taskId);
    try {
      const res = await agentClient.updateTask(taskId, nextStatus);
      if (res.ok) {
        await loadTasks();
      } else {
        setTaskError(res.message || 'Failed to update task');
      }
    } finally {
      setUpdatingTaskId('');
    }
  }

  async function toggleTracking() {
    setSettingsMessage('');
    try {
      if (status.tracking) {
        await agentClient.stopTracking();
        setSettingsMessage('Tracking paused and the current work session was closed.');
      } else if (status.breakActive) {
        await agentClient.endBreak();
        setSettingsMessage('Break ended and tracking resumed.');
      } else {
        await agentClient.startTracking();
        setSettingsMessage('Tracking started for the current work session.');
      }
    } catch (err) {
      setSettingsMessage(err?.message || 'Unable to change tracking state right now.');
    }
  }

  async function toggleBreak() {
    setSettingsMessage('');
    try {
      if (status.breakActive) {
        await agentClient.endBreak();
        setSettingsMessage('Break ended and tracking resumed.');
      } else if (status.tracking) {
        await agentClient.startBreak();
        setSettingsMessage('Break started. Tracking is paused until you resume work.');
      } else {
        setSettingsMessage('Start tracking before taking a break.');
      }
    } catch (err) {
      setSettingsMessage(err?.message || 'Unable to change break state right now.');
    }
  }

  async function logout() {
    clearPersistedWorkspace();
    await agentClient.logout();
  }

  async function handleProofSelection(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.path) {
      setProofStatus('The selected file path is unavailable in this desktop session.');
      event.target.value = '';
      return;
    }

    setProofStatus('Saving proof locally...');
    try {
      const res = await agentClient.saveProof({ filePath: file.path, fileName: file.name });
      if (res.ok) {
        setProofName(res.data.originalName);
        setProofStatus(`Saved locally at ${new Date(res.data.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
      } else {
        setProofStatus(res.message || 'Unable to save proof locally.');
      }
    } catch (err) {
      setProofStatus(err?.message || 'Unable to save proof locally.');
    } finally {
      event.target.value = '';
    }
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    status,
    loading,
    loginError,
    tasks,
    taskError,
    tasksLoading,
    updatingTaskId,
    now,
    proofName,
    proofStatus,
    settingsMessage,
    setSettingsMessage,
    activeView,
    setActiveView,
    activityFeed,
    appUsage,
    websiteUsage,
    screenshotFeed,
    isEmployee,
    completedTasks,
    inProgressTasks,
    currentTask,
    currentFocus,
    currentFocusTitle,
    websiteSignal,
    activeSecondsToday,
    idleSecondsToday,
    trackedSecondsToday,
    workTimer,
    productivityScore,
    activeRatio,
    taskCompletionRatio,
    syncStateLabel,
    visibleNavItems,
    currentView,
    lastScreenshotState,
    todayLabel,
    actionStatusLabel,
    canToggleBreak,
    loadTasks,
    login,
    updateTaskStatus,
    toggleTracking,
    toggleBreak,
    logout,
    handleProofSelection
  };
}
