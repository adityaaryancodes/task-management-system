import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import { KpiCard } from '../../components/common/KpiCard';

export function NotificationsPage() {
  const [alerts, setAlerts] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/policy/alerts', { params: { limit: 20, unresolved_only: true } }), api.get('/activity/live-status')])
      .then(([alertsRes, statusRes]) => {
        setAlerts(alertsRes.data.data || []);
        setStatuses(statusRes.data.data || []);
        setError('');
      })
      .catch((err) => {
        setAlerts([]);
        setStatuses([]);
        setError(err?.response?.data?.message || 'Failed to load notifications');
      });
  }, []);

  const feed = useMemo(() => {
    const alertFeed = alerts.map((alert) => ({
      id: `alert-${alert.id}`,
      title: `${alert.full_name || alert.email || 'Employee'} opened ${alert.app_name}`,
      subtitle: alert.window_title || 'Unauthorized app detected',
      time: alert.detected_at,
      tone: 'critical'
    }));

    const idleFeed = statuses
      .filter((status) => status.status === 'idle')
      .map((status) => ({
        id: `idle-${status.user_id}`,
        title: `${status.full_name || status.email || 'Employee'} is idle`,
        subtitle: `${status.idle_minutes || 0} minutes idle on ${status.device_name || 'active device'}`,
        time: status.latest_activity_at || status.last_seen_at || status.login_at,
        tone: 'warning'
      }));

    const activeFeed = statuses
      .filter((status) => status.status === 'active')
      .map((status) => ({
        id: `active-${status.user_id}`,
        title: `${status.full_name || status.email || 'Employee'} is active`,
        subtitle: `${status.current_app || 'No app detected'} in focus`,
        time: status.latest_activity_at || status.last_seen_at || status.login_at,
        tone: 'info'
      }));

    return [...alertFeed, ...idleFeed, ...activeFeed]
      .filter((entry) => entry.time)
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [alerts, statuses]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Awareness</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Notifications</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          Consolidated activity, idle signals, and policy alerts so managers can respond from one queue.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard title="Open Alerts" value={alerts.length} subtitle="Policy-driven notifications" />
        <KpiCard title="Idle Signals" value={statuses.filter((status) => status.status === 'idle').length} subtitle="Employees currently idle" />
        <KpiCard title="Active Signals" value={statuses.filter((status) => status.status === 'active').length} subtitle="Employees currently active" />
      </div>

      <div className="kpi-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notification Feed</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Latest operational signals ranked by urgency and recency.</p>
          </div>
          {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}
        </div>

        <div className="space-y-3">
          {feed.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border px-4 py-4 ${
                item.tone === 'critical'
                  ? 'border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30'
                  : item.tone === 'warning'
                    ? 'border-amber-200 bg-amber-50 dark:border-amber-900/70 dark:bg-amber-950/30'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40'
              }`}
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.subtitle}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{new Date(item.time).toLocaleString()}</p>
            </div>
          ))}
        </div>

        {!feed.length && !error ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No notifications right now.</p>
        ) : null}
      </div>
    </div>
  );
}
