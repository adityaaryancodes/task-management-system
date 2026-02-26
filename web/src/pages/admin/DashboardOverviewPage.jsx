import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../lib/api';
import { getToken, getUser } from '../../lib/auth';
import { KpiCard } from '../../components/common/KpiCard';

function toPolicyAlertsWsUrl() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001';
  const wsBase = apiBase.startsWith('https://')
    ? `wss://${apiBase.slice('https://'.length)}`
    : apiBase.startsWith('http://')
      ? `ws://${apiBase.slice('http://'.length)}`
      : apiBase;
  return `${wsBase.replace(/\/+$/, '')}/ws/policy-alerts`;
}

export function DashboardOverviewPage() {
  const [summary, setSummary] = useState({ totalEmployees: 0, activeToday: 0, taskCompletion: 0 });
  const [daily, setDaily] = useState([]);
  const [apps, setApps] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertsError, setAlertsError] = useState('');
  const [resolvingId, setResolvingId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    api
      .get('/users', { params: { role: 'employee', limit: 100, page: 1 } })
      .then((res) => setEmployees(res.data.data || []))
      .catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    const params = selectedEmployeeId === 'all' ? {} : { user_id: selectedEmployeeId };

    api
      .get('/analytics/overview', { params })
      .then((res) => {
        setSummary(res.data.summary || { totalEmployees: 0, activeToday: 0, taskCompletion: 0 });
        setDaily(res.data.activeIdleSeries || []);
        setApps(res.data.appUsage || []);
        setSelectedEmployee(res.data.selectedEmployee || null);
      })
      .catch(() => {
        setSummary({ totalEmployees: 0, activeToday: 0, taskCompletion: 0 });
        setDaily([]);
        setApps([]);
        setSelectedEmployee(null);
      });

    api
      .get('/policy/alerts', { params: { limit: 10, unresolved_only: true, ...params } })
      .then((res) => {
        setAlerts(res.data.data || []);
        setAlertsError('');
      })
      .catch((err) => setAlertsError(err?.response?.data?.message || 'Failed to load policy alerts'));
  }, [selectedEmployeeId]);

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
              if (prev.some((a) => a.id === message.data.id)) return prev;
              return [message.data, ...prev].slice(0, 20);
            });
          }
          if (message?.type === 'policy_alert_resolved' && message.data?.id) {
            setAlerts((prev) => prev.filter((a) => a.id !== message.data.id));
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
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setAlertsError(err?.response?.data?.message || 'Failed to resolve alert');
    } finally {
      setResolvingId('');
    }
  }

  const visibleAlerts = selectedEmployeeId === 'all' ? alerts : alerts.filter((alert) => alert.user_id === selectedEmployeeId);
  const selectedEmployeeInfo =
    selectedEmployee || employees.find((employee) => employee.id === selectedEmployeeId) || null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">Dashboard Overview</h2>
      <div className="kpi-card">
        <label className="text-sm font-medium text-slate-700" htmlFor="employee-dashboard-select">
          Employee Dashboard View
        </label>
        <div className="mt-2">
          <select
            id="employee-dashboard-select"
            className="w-full md:w-80 border border-slate-300 rounded-lg px-3 py-2 text-sm"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
          >
            <option value="all">All employees (Org view)</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name} ({employee.email})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <KpiCard
          title={selectedEmployeeId === 'all' ? 'Employees' : 'Employee'}
          value={selectedEmployeeId === 'all' ? summary.totalEmployees : selectedEmployeeInfo?.full_name || 'Unknown employee'}
          subtitle={selectedEmployeeId === 'all' ? 'Total registered users' : selectedEmployeeInfo?.email || ''}
        />
        <KpiCard
          title="Active Today"
          value={selectedEmployeeId === 'all' ? summary.activeToday : summary.activeToday > 0 ? 'Yes' : 'No'}
          subtitle={selectedEmployeeId === 'all' ? 'Logged in today' : 'Logged in today status'}
        />
        <KpiCard
          title="Task Completion Rate"
          value={`${summary.taskCompletion}%`}
          subtitle={selectedEmployeeId === 'all' ? 'Completed tasks this week' : 'Completed tasks for selected employee (7 days)'}
        />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="kpi-card h-80">
          <p className="font-medium mb-3">Active vs Idle Time</p>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="active" stackId="1" stroke="#0a5dc2" fill="#8bc3ff" />
              <Area type="monotone" dataKey="idle" stackId="1" stroke="#f97316" fill="#fdba74" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="kpi-card h-80">
          <p className="font-medium mb-3">App Usage Breakdown</p>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={apps} dataKey="minutes" nameKey="app" outerRadius={120} fill="#0a5dc2" />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="kpi-card">
        <p className="font-medium mb-3">Policy Alerts (Unauthorized Apps)</p>
        {alertsError ? <p className="text-sm text-red-600 mb-2">{alertsError}</p> : null}
        {!visibleAlerts.length ? (
          <p className="text-sm text-slate-500">No unresolved policy alerts.</p>
        ) : (
          <div className="space-y-2">
            {visibleAlerts.map((alert) => (
              <div key={alert.id} className="border border-red-200 bg-red-50 rounded-lg p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    {alert.full_name || alert.email || alert.user_id} opened {alert.app_name}
                  </p>
                  <p className="text-xs text-red-700">
                    {alert.email || 'No email'} | {alert.device_name || alert.device_id}
                  </p>
                  <p className="text-xs text-red-700">
                    {new Date(alert.detected_at).toLocaleString()}
                    {alert.window_title ? ` | ${alert.window_title}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded bg-red-600 text-white text-sm disabled:opacity-60"
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
