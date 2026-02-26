import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../lib/api';

export function ActivityAnalyticsPage() {
  const [employeeSeries, setEmployeeSeries] = useState([]);
  const [error, setError] = useState('');
  const hasEmployees = employeeSeries.length > 0;

  useEffect(() => {
    api
      .get('/analytics/productivity?group_by=user')
      .then((res) => setEmployeeSeries(res.data.data || []))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load analytics'));
  }, []);

  return (
    <div className="space-y-4">
      <div className="kpi-card">
        <h2 className="text-xl font-semibold mb-2">Activity Analytics</h2>
        <p className="text-sm text-slate-500">Per-employee active vs idle minutes for the last 14 days.</p>
        {error ? <p className="text-sm text-red-600 mt-3">{error}</p> : null}
        {!hasEmployees && !error ? (
          <div className="mt-5 text-sm text-slate-500">
            No employee activity data yet. Keep desktop tracking on, then refresh this page.
          </div>
        ) : null}
      </div>

      {hasEmployees ? (
        <div className="grid gap-4 md:grid-cols-2">
          {employeeSeries.map((employee) => {
            const series = Array.isArray(employee.series) ? employee.series : [];
            const employeeName = employee.full_name || employee.email || 'Employee';

            return (
              <div key={employee.user_id} className="kpi-card h-[360px]">
                <p className="text-sm font-semibold text-slate-900">{employeeName}</p>
                {employee.email ? <p className="text-xs text-slate-500 mb-2">{employee.email}</p> : null}
                {series.length ? (
                  <ResponsiveContainer width="100%" height="86%">
                    <BarChart data={series}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="active_minutes" fill="#0a5dc2" />
                      <Bar dataKey="idle_minutes" fill="#f97316" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[82%] flex items-center justify-center text-sm text-slate-500">
                    No activity captured for this employee yet.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
