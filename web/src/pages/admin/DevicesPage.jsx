import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import { KpiCard } from '../../components/common/KpiCard';

function statusClass(status) {
  if (status === 'active') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
  if (status === 'idle') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200';
  return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

export function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/activity/live-status')
      .then((res) => {
        setDevices(res.data.data || []);
        setError('');
      })
      .catch((err) => {
        setDevices([]);
        setError(err?.response?.data?.message || 'Failed to load devices');
      });
  }, []);

  const stats = useMemo(
    () =>
      devices.reduce(
        (acc, device) => {
          acc.total += 1;
          acc[device.status] = (acc[device.status] || 0) + 1;
          return acc;
        },
        { total: 0, active: 0, idle: 0, offline: 0 }
      ),
    [devices]
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Operations</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Device Management</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          Monitor device presence, spot inactive machines, and prepare for force logout or remote controls from one table.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Devices" value={stats.total} subtitle="Tracked device sessions" />
        <KpiCard title="Online" value={stats.active} subtitle="Devices with active tracked work" />
        <KpiCard title="Idle" value={stats.idle} subtitle="Logged in but idle" />
        <KpiCard title="Offline" value={stats.offline} subtitle="No live heartbeat in the active window" />
      </div>

      <div className="kpi-card">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Connected Devices</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Actions are scaffolded in the UI now and can be wired to backend controls next.
            </p>
          </div>
          {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="pb-3 pr-4 font-medium">Device</th>
                <th className="pb-3 pr-4 font-medium">User</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Current App</th>
                <th className="pb-3 pr-4 font-medium">Last Seen</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={`${device.user_id}-${device.device_id || device.device_name}`} className="border-b border-slate-100 dark:border-slate-900">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{device.device_name || 'Unknown device'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{device.device_id || 'Pending binding'}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-slate-900 dark:text-slate-100">{device.full_name || 'Unknown user'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{device.email}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(device.status)}`}>
                      {device.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{device.current_app || '-'}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                    {device.last_seen_at || device.latest_activity_at
                      ? new Date(device.last_seen_at || device.latest_activity_at).toLocaleString()
                      : '-'}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400"
                      >
                        Disable
                      </button>
                      <button
                        type="button"
                        disabled
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400"
                      >
                        Force logout
                      </button>
                      <button
                        type="button"
                        disabled
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400"
                      >
                        Remote screenshot
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!devices.length && !error ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No devices have reported live activity yet.</p>
        ) : null}
      </div>
    </div>
  );
}
