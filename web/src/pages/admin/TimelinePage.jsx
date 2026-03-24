import { useEffect, useState } from 'react';
import api from '../../lib/api';

export function TimelinePage() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');

  useEffect(() => {
    api
      .get('/users', { params: { role: 'employee', limit: 100, page: 1 } })
      .then((res) => setEmployees(res.data.data || []))
      .catch(() => setEmployees([]));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Work Intelligence</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Timeline</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          This UI is ready for a future work timeline API that merges attendance, app focus, idle states, screenshots, and tasks into one enterprise-grade playback.
        </p>
      </div>

      <div className="kpi-card">
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500" htmlFor="timeline-employee">
          Employee Scope
        </label>
        <select
          id="timeline-employee"
          className="mt-3 w-full md:w-80"
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
      </div>

      <div className="kpi-card">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Timeline Preview</p>
        <div className="mt-4 space-y-4">
          {[
            '09:00 Login',
            '09:10 Chrome - LinkedIn',
            '09:45 Excel - Leads Sheet',
            '10:20 Idle',
            '10:35 Chrome - Gmail',
            '11:15 Screenshot captured'
          ].map((item) => (
            <div key={item} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="h-3 w-3 rounded-full bg-brand-500" />
              <p className="text-sm text-slate-700 dark:text-slate-300">{item}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Next step: connect this page to a dedicated timeline endpoint built from `attendance`, `activity_logs`, `screenshots`, and `tasks`.
        </p>
      </div>
    </div>
  );
}
