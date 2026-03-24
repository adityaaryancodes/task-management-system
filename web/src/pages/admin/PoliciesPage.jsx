import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import { KpiCard } from '../../components/common/KpiCard';
import { useTheme } from '../../components/theme/ThemeProvider';

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

export function PoliciesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');
  const [resolvingId, setResolvingId] = useState('');

  useEffect(() => {
    api
      .get('/policy/alerts', { params: { limit: 50 } })
      .then((res) => {
        setAlerts(res.data.data || []);
        setError('');
      })
      .catch((err) => {
        setAlerts([]);
        setError(err?.response?.data?.message || 'Failed to load policy alerts');
      });
  }, []);

  async function resolveAlert(id) {
    try {
      setResolvingId(id);
      await api.patch(`/policy/alerts/${id}/resolve`);
      setAlerts((prev) => prev.map((alert) => (alert.id === id ? { ...alert, resolved_at: new Date().toISOString() } : alert)));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to resolve alert');
    } finally {
      setResolvingId('');
    }
  }

  const stats = useMemo(() => {
    const unresolved = alerts.filter((alert) => !alert.resolved_at).length;
    const resolved = alerts.filter((alert) => alert.resolved_at).length;
    const today = alerts.filter((alert) => isToday(alert.detected_at)).length;
    return { unresolved, resolved, today };
  }, [alerts]);

  return (
    <div className="space-y-4">
      <div>
        <p className={`text-sm uppercase tracking-[0.22em] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Governance</p>
        <h2 className={`mt-2 text-2xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Policies</h2>
        <p className={`mt-2 max-w-3xl text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Review unauthorized application usage, coach teams quickly, and keep a clean policy event trail.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard title="Open Alerts" value={stats.unresolved} subtitle="Requires action from a manager" />
        <KpiCard title="Resolved Alerts" value={stats.resolved} subtitle="Closed after review" />
        <KpiCard title="Triggered Today" value={stats.today} subtitle="Signals generated today" />
      </div>

      <div className="kpi-card">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Policy Event Queue</p>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Review the most recent policy activity and resolve alerts from this workspace.</p>
          </div>
          {error ? <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-600'}`}>{error}</p> : null}
        </div>

        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="surface-subtle flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{alert.app_name}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      alert.resolved_at
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                    }`}
                  >
                    {alert.resolved_at ? 'Resolved' : 'Open'}
                  </span>
                </div>
                <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {alert.full_name || alert.email || alert.user_id} on {alert.device_name || alert.device_id}
                </p>
                <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {new Date(alert.detected_at).toLocaleString()}
                  {alert.window_title ? ` | ${alert.window_title}` : ''}
                </p>
              </div>
              <button
                type="button"
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                disabled={Boolean(alert.resolved_at) || resolvingId === alert.id}
                onClick={() => resolveAlert(alert.id)}
              >
                {alert.resolved_at ? 'Resolved' : resolvingId === alert.id ? 'Resolving...' : 'Resolve alert'}
              </button>
            </div>
          ))}
        </div>

        {!alerts.length && !error ? (
          <p className={`mt-4 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No policy alerts detected yet.</p>
        ) : null}
      </div>
    </div>
  );
}
