import { useEffect, useState } from 'react';
import api from '../../lib/api';

export function AttendanceLogsPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/attendance/logs')
      .then((res) => setLogs(res.data.data || []))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load attendance logs'));
  }, []);

  return (
    <div className="kpi-card">
      <h2 className="text-xl font-semibold mb-4">Attendance Logs</h2>
      {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th>User</th>
              <th>Login</th>
              <th>Logout</th>
              <th>Session (min)</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-slate-200">
                <td className="py-2">{log.full_name}</td>
                <td>{new Date(log.login_at).toLocaleString()}</td>
                <td>{log.logout_at ? new Date(log.logout_at).toLocaleString() : '-'}</td>
                <td>{log.session_seconds ? Math.round(log.session_seconds / 60) : 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
