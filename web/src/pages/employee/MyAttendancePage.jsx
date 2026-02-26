import { useEffect, useState } from 'react';
import api from '../../lib/api';

export function MyAttendancePage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get('/attendance/logs?scope=me').then((res) => setLogs(res.data.data || []));
  }, []);

  return (
    <div className="kpi-card">
      <h2 className="text-xl font-semibold mb-4">My Attendance</h2>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="border border-slate-200 rounded p-3">
            <p className="text-sm">Login: {new Date(log.login_at).toLocaleString()}</p>
            <p className="text-sm">Logout: {log.logout_at ? new Date(log.logout_at).toLocaleString() : '-'}</p>
            <p className="text-xs text-slate-500">Session: {Math.round((log.session_seconds || 0) / 60)} min</p>
          </div>
        ))}
      </div>
    </div>
  );
}
