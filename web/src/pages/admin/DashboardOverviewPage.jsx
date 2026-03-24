import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api from '../../lib/api';
import { getToken, getUser } from '../../lib/auth';
import { KpiCard } from '../../components/common/KpiCard';

const PIE_COLORS = ['#0a5dc2', '#2f83ff', '#6caaf7', '#97baf6', '#f97316', '#fbbf24'];

function toPolicyAlertsWsUrl() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001';
  const wsBase = apiBase.startsWith('https://')
    ? `wss://${apiBase.slice('https://'.length)}`
    : apiBase.startsWith('http://')
      ? `ws://${apiBase.slice('http://'.length)}`
      : apiBase;
  return `${wsBase.replace(/\/+$/, '')}/ws/policy-alerts`;
}

function isToday(value) {
  if (!value) return false;
  const target = new Date(value);
  const now = new Date();
  return (
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate()
  );
}

function shortName(fullName, fallback = 'Employee') {
  const text = String(fullName || '').trim();
  if (!text) return fallback;
  return text.split(/\s+/).slice(0, 2).join(' ');
}

function statusBadgeClass(status) {
  if (status === 'active') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
  if (status === 'idle') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200';
  return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

function formatIdleTime(status, idleMinutes) {
  if (status !== 'idle') return '-';
  const minutes = Number.isFinite(Number(idleMinutes)) ? Number(idleMinutes) : 0;
  return `${minutes} min`;
}

function emptySummary() {
  return { totalEmployees: 0, activeToday: 0, taskCompletion: 0 };
}

function groupAttendanceByDay(logs) {
  const grouped = logs.reduce((acc, log) => {
    const day = new Date(log.login_at).toISOString().slice(0, 10);
    if (!acc.has(day)) {
      acc.set(day, { date: day, sessions: 0 });
    }
    acc.get(day).sessions += 1;
    return acc;
  }, new Map());

  return Array.from(grouped.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);
}

export function DashboardOverviewPage() {
  const [summary, setSummary] = useState(emptySummary());
  const [daily, setDaily] = useState([]);
  const [apps, setApps] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertsError, setAlertsError] = useState('');
  const [resolvingId, setResolvingId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [liveStatuses, setLiveStatuses] = useState([]);
  const [liveStatusError, setLiveStatusError] = useState('');
  const [productivitySummary, setProductivitySummary] = useState({
    averageScore: 0,
    employeeCount: 0,
    topPerformer: null,
    lowestPerformer: null
  });
  const [productivityTrend, setProductivityTrend] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);

  useEffect(() => {
    api
      .get('/users', { params: { role: 'employee', limit: 100, page: 1 } })
      .then((res) => setEmployees(res.data.data || []))
      .catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    const params = selectedEmployeeId === 'all' ? {} : { user_id: selectedEmployeeId };

    Promise.all([
      api.get('/analytics/overview', { params }),
      api.get('/policy/alerts', { params: { limit: 100, ...params } }),
      api.get('/analytics/productivity-score'),
      api.get('/tasks', { params: { limit: 200, page: 1 } }),
      api.get('/attendance/logs', { params: { limit: 200, page: 1 } })
    ])
      .then(([overviewRes, alertsRes, productivityRes, tasksRes, attendanceRes]) => {
        setSummary(overviewRes.data.summary || emptySummary());
        setDaily(overviewRes.data.activeIdleSeries || []);
        setApps(overviewRes.data.appUsage || []);
        setSelectedEmployee(overviewRes.data.selectedEmployee || null);
        setAlerts(alertsRes.data.data || []);
        setAlertsError('');
        setProductivitySummary(
          productivityRes.data.summary || {
            averageScore: 0,
            employeeCount: 0,
            topPerformer: null,
            lowestPerformer: null
          }
        );
        setProductivityTrend(productivityRes.data.weeklyTrend || []);
        setLeaderboard(productivityRes.data.leaderboard || []);
        setTasks(tasksRes.data.data || []);
        setAttendanceLogs(attendanceRes.data.data || []);
      })
      .catch((err) => {
        setSummary(emptySummary());
        setDaily([]);
        setApps([]);
        setSelectedEmployee(null);
        setAlerts([]);
        setTasks([]);
        setAttendanceLogs([]);
        setProductivitySummary({
          averageScore: 0,
          employeeCount: 0,
          topPerformer: null,
          lowestPerformer: null
        });
        setProductivityTrend([]);
        setLeaderboard([]);
        setAlertsError(err?.response?.data?.message || 'Failed to load dashboard insights');
      });
  }, [selectedEmployeeId]);

  useEffect(() => {
    let isMounted = true;

    const loadLiveStatus = () => {
      api
        .get('/activity/live-status')
        .then((res) => {
          if (!isMounted) return;
          setLiveStatuses(res.data.data || []);
          setLiveStatusError('');
        })
        .catch((err) => {
          if (!isMounted) return;
          setLiveStatuses([]);
          setLiveStatusError(err?.response?.data?.message || 'Failed to load live employee status');
        });
    };

    loadLiveStatus();
    const intervalId = setInterval(loadLiveStatus, 30000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (!token || !user?.org_id || !['owner', 'manager'].includes(user.role)) return undefined;

    const wsUrl = `${toPolicyAlertsWsUrl()}?token=${encodeURIComponent(token)}&org_id=${encodeURIComponent(user.org_id)}`;
    let ws;
    let retryTimer = null;
    let shouldReconnect = true;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type === 'policy_alert_created' && message.data) {
            setAlerts((prev) => {
              if (prev.some((alert) => alert.id === message.data.id)) return prev;
              return [message.data, ...prev].slice(0, 100);
            });
          }
          if (message?.type === 'policy_alert_resolved' && message.data?.id) {
            setAlerts((prev) =>
              prev.map((alert) => (alert.id === message.data.id ? { ...alert, resolved_at: message.data.resolved_at || new Date().toISOString() } : alert))
            );
          }
        } catch {}
      };
      ws.onclose = () => {
        if (!shouldReconnect) return;
        retryTimer = setTimeout(connect, 2000);
      };
      ws.onerror = () => {
        try {
          ws.close();
        } catch {}
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      if (retryTimer) clearTimeout(retryTimer);
      if (ws) ws.close();
    };
  }, []);

  async function resolveAlert(id) {
    try {
      setResolvingId(id);
      await api.patch(`/policy/alerts/${id}/resolve`);
      setAlerts((prev) => prev.map((alert) => (alert.id === id ? { ...alert, resolved_at: new Date().toISOString() } : alert)));
    } catch (err) {
      setAlertsError(err?.response?.data?.message || 'Failed to resolve alert');
    } finally {
      setResolvingId('');
    }
  }

  const selectedEmployeeInfo = selectedEmployee || employees.find((employee) => employee.id === selectedEmployeeId) || null;

  const scopedLiveStatuses = useMemo(
    () => (selectedEmployeeId === 'all' ? liveStatuses : liveStatuses.filter((employee) => employee.user_id === selectedEmployeeId)),
    [liveStatuses, selectedEmployeeId]
  );

  const scopedLeaderboard = useMemo(
    () => (selectedEmployeeId === 'all' ? leaderboard : leaderboard.filter((employee) => employee.user_id === selectedEmployeeId)),
    [leaderboard, selectedEmployeeId]
  );

  const scopedTasks = useMemo(
    () => (selectedEmployeeId === 'all' ? tasks : tasks.filter((task) => task.assignee_user_id === selectedEmployeeId)),
    [tasks, selectedEmployeeId]
  );

  const scopedAttendanceLogs = useMemo(
    () => (selectedEmployeeId === 'all' ? attendanceLogs : attendanceLogs.filter((log) => log.user_id === selectedEmployeeId)),
    [attendanceLogs, selectedEmployeeId]
  );

  const scopedAlerts = useMemo(
    () => (selectedEmployeeId === 'all' ? alerts : alerts.filter((alert) => alert.user_id === selectedEmployeeId)),
    [alerts, selectedEmployeeId]
  );

  const liveSummary = scopedLiveStatuses.reduce(
    (acc, employee) => {
      acc[employee.status] = (acc[employee.status] || 0) + 1;
      return acc;
    },
    { active: 0, idle: 0, offline: 0 }
  );

  const unresolvedAlerts = scopedAlerts.filter((alert) => !alert.resolved_at).slice(0, 10);
  const currentProductivityScore =
    selectedEmployeeId === 'all' ? productivitySummary.averageScore || 0 : Number(scopedLeaderboard[0]?.productivity_score || 0);
  const tasksCompletedToday = scopedTasks.filter((task) => task.status === 'completed' && isToday(task.completed_at)).length;
  const policyViolationsToday = scopedAlerts.filter((alert) => isToday(alert.detected_at)).length;
  const attendanceTrend = groupAttendanceByDay(scopedAttendanceLogs);
  const taskCompletionByEmployee = scopedLeaderboard
    .slice(0, 6)
    .map((employee) => ({ name: shortName(employee.full_name, employee.email), completed: Number(employee.completed_tasks || 0) }));
  const liveActivityFeed = scopedLiveStatuses.slice(0, 8);
  const appUsageData = apps.length ? apps : [{ app: 'No activity yet', minutes: 1 }];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Company Control Center</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Dashboard</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Monitor workforce performance, track live activity, and surface coaching signals before they become operational issues.
          </p>
        </div>
        <div className="kpi-card max-w-xl w-full">
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500" htmlFor="employee-dashboard-select">
            Dashboard Scope
          </label>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
            <select
              id="employee-dashboard-select"
              className="w-full md:w-80"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
            >
              <option value="all">All employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name} ({employee.email})
                </option>
              ))}
            </select>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {selectedEmployeeId === 'all'
                ? `${summary.totalEmployees} employees in scope`
                : `${selectedEmployeeInfo?.full_name || 'Employee'} focus view`}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard title="Total Employees" value={selectedEmployeeId === 'all' ? summary.totalEmployees : selectedEmployeeInfo?.full_name || 'Unknown'} subtitle={selectedEmployeeId === 'all' ? 'Registered workforce' : selectedEmployeeInfo?.email || 'Employee drill-down'} />
        <KpiCard title="Active Now" value={liveSummary.active || 0} subtitle="Currently active on desktop agent" />
        <KpiCard title="Avg Productivity" value={`${currentProductivityScore}%`} subtitle="Weekly blended productivity score" />
        <KpiCard title="Tasks Completed Today" value={tasksCompletedToday} subtitle="Completed tasks with a same-day closeout" />
        <KpiCard title="Idle Employees" value={liveSummary.idle || 0} subtitle="Idle for at least five minutes" />
        <KpiCard title="Policy Violations Today" value={policyViolationsToday} subtitle="Alerts triggered across the org today" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
        <div className="kpi-card h-[360px]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Productivity Trend</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Average workforce score across the last 7 days.</p>
            </div>
            <div className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
              Avg {currentProductivityScore}%
            </div>
          </div>
          {productivityTrend.length ? (
            <ResponsiveContainer width="100%" height="86%">
              <LineChart data={productivityTrend}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="avg_score" stroke="#0a5dc2" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[86%] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              No productivity trend data yet.
            </div>
          )}
        </div>

        <div className="kpi-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Live Activity</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Real-time employee app focus and status.</p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                Active {liveSummary.active || 0}
              </span>
              <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                Idle {liveSummary.idle || 0}
              </span>
            </div>
          </div>
          {liveStatusError ? <p className="mb-3 text-sm text-red-600 dark:text-red-300">{liveStatusError}</p> : null}
          <div className="space-y-3">
            {liveActivityFeed.length ? (
              liveActivityFeed.map((employee) => (
                <div key={employee.user_id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{employee.full_name || employee.email || 'Employee'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{employee.current_app || 'No active app'}{employee.current_window_title ? ` - ${employee.current_window_title}` : ''}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusBadgeClass(employee.status)}`}>
                      {employee.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>Task: {employee.current_task || '-'}</span>
                    <span>{formatIdleTime(employee.status, employee.idle_minutes)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No employee activity is streaming in yet. Start the desktop agent to populate this panel.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="kpi-card h-[330px]">
          <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Active vs Idle Time</p>
          {daily.length ? (
            <ResponsiveContainer width="100%" height="86%">
              <AreaChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="active" stackId="1" stroke="#0a5dc2" fill="#8bc3ff" />
                <Area type="monotone" dataKey="idle" stackId="1" stroke="#f97316" fill="#fdba74" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[86%] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              No active vs idle history yet.
            </div>
          )}
        </div>

        <div className="kpi-card h-[330px]">
          <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">App Usage Breakdown</p>
          <ResponsiveContainer width="100%" height="86%">
            <PieChart>
              <Pie data={appUsageData} dataKey="minutes" nameKey="app" outerRadius={110} innerRadius={55}>
                {appUsageData.map((entry, index) => (
                  <Cell key={`${entry.app}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="kpi-card h-[330px]">
          <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Attendance Trend</p>
          {attendanceTrend.length ? (
            <ResponsiveContainer width="100%" height="86%">
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="sessions" stroke="#2f83ff" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[86%] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              No attendance trend data yet.
            </div>
          )}
        </div>

        <div className="kpi-card h-[330px]">
          <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Tasks Completed Per Employee</p>
          {taskCompletionByEmployee.length ? (
            <ResponsiveContainer width="100%" height="86%">
              <BarChart data={taskCompletionByEmployee}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#0a5dc2" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[86%] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              No completed task leaderboard yet.
            </div>
          )}
        </div>
      </div>

      <div className="kpi-card">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Alerts and Violations</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Unauthorized apps and policy exceptions requiring attention.</p>
          </div>
          {alertsError ? <p className="text-sm text-red-600 dark:text-red-300">{alertsError}</p> : null}
        </div>
        {!unresolvedAlerts.length ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No unresolved policy alerts.</p>
        ) : (
          <div className="space-y-3">
            {unresolvedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 dark:border-red-900/70 dark:bg-red-950/30 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                    {alert.full_name || alert.email || alert.user_id} opened {alert.app_name}
                  </p>
                  <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                    {alert.email || 'No email'} | {alert.device_name || alert.device_id}
                  </p>
                  <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                    {new Date(alert.detected_at).toLocaleString()}
                    {alert.window_title ? ` | ${alert.window_title}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  disabled={resolvingId === alert.id}
                  onClick={() => resolveAlert(alert.id)}
                >
                  {resolvingId === alert.id ? 'Resolving...' : 'Resolve'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
