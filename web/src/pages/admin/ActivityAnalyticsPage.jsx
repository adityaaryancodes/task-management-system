import { useEffect, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../lib/api';
import { KpiCard } from '../../components/common/KpiCard';

function performerLabel(performer) {
  if (!performer) return 'No data';
  return `${performer.full_name || performer.email || 'Employee'} (${performer.productivity_score}%)`;
}

export function ActivityAnalyticsPage() {
  const [employeeSeries, setEmployeeSeries] = useState([]);
  const [productivitySummary, setProductivitySummary] = useState({
    averageScore: 0,
    employeeCount: 0,
    topPerformer: null,
    lowestPerformer: null
  });
  const [productivityTrend, setProductivityTrend] = useState([]);
  const [scoreboard, setScoreboard] = useState([]);
  const [error, setError] = useState('');
  const hasEmployees = employeeSeries.length > 0;
  const hasScoreboard = scoreboard.length > 0;

  useEffect(() => {
    Promise.all([api.get('/analytics/productivity?group_by=user'), api.get('/analytics/productivity-score')])
      .then(([productivityRes, scoreRes]) => {
        setEmployeeSeries(productivityRes.data.data || []);
        setProductivitySummary(
          scoreRes.data.summary || {
            averageScore: 0,
            employeeCount: 0,
            topPerformer: null,
            lowestPerformer: null
          }
        );
        setProductivityTrend(scoreRes.data.weeklyTrend || []);
        setScoreboard(scoreRes.data.leaderboard || []);
        setError('');
      })
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load analytics'));
  }, []);

  return (
    <div className="space-y-4">
      <div className="kpi-card">
        <h2 className="mb-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Activity Analytics</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Productivity scoring blends active time, task completion, and policy discipline into a weekly workforce intelligence view.
        </p>
        {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
        {!hasEmployees && !hasScoreboard && !error ? (
          <div className="mt-5 text-sm text-slate-500 dark:text-slate-400">
            No employee activity data yet. Keep desktop tracking on, then refresh this page.
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Team Productivity Score" value={`${productivitySummary.averageScore || 0}%`} subtitle="Weekly blended score" />
        <KpiCard title="Top Performer" value={performerLabel(productivitySummary.topPerformer)} subtitle="Highest productivity score this week" />
        <KpiCard
          title="Lowest Productivity"
          value={performerLabel(productivitySummary.lowestPerformer)}
          subtitle="Needs coaching or process review"
        />
        <KpiCard title="Employees Scored" value={productivitySummary.employeeCount || 0} subtitle="Active employees in the leaderboard" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="kpi-card h-[340px]">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Weekly Productivity Trend</p>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Average daily productivity score across employees for the last 7 days.</p>
          {productivityTrend.length ? (
            <ResponsiveContainer width="100%" height="84%">
              <AreaChart data={productivityTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="avg_score" stroke="#0a5dc2" fill="#8bc3ff" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[84%] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              No weekly score trend yet.
            </div>
          )}
        </div>

        <div className="kpi-card">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Productivity Scoreboard</p>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Per-employee KPI score for the last 7 days.</p>
          {!hasScoreboard ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">No score data available yet.</div>
          ) : (
            <div className="space-y-3">
              {scoreboard.slice(0, 5).map((employee) => (
                <div key={employee.user_id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{employee.full_name || employee.email || 'Employee'}</p>
                      {employee.email ? <p className="text-xs text-slate-500 dark:text-slate-400">{employee.email}</p> : null}
                    </div>
                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                      {employee.productivity_score}%
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">{employee.activity_ratio}%</p>
                      <p>Active ratio</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">{employee.task_completion_rate}%</p>
                      <p>Task completion</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">{employee.policy_penalty}%</p>
                      <p>Policy penalty</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="kpi-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Per-Employee Productivity Scores</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Weekly leaderboard with the components that drive each score.</p>
          </div>
        </div>
        {!hasScoreboard ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No productivity scores available yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="pb-3 pr-4 font-medium">Employee</th>
                  <th className="pb-3 pr-4 font-medium">Score</th>
                  <th className="pb-3 pr-4 font-medium">Active Ratio</th>
                  <th className="pb-3 pr-4 font-medium">Completion</th>
                  <th className="pb-3 pr-4 font-medium">Violations</th>
                  <th className="pb-3 font-medium">Tracked Time</th>
                </tr>
              </thead>
              <tbody>
                {scoreboard.map((employee) => (
                  <tr key={employee.user_id} className="border-b border-slate-100">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{employee.full_name || 'Employee'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{employee.email}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                        {employee.productivity_score}%
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">
                      {employee.activity_ratio}% ({employee.active_minutes}/{employee.logged_minutes} min)
                    </td>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">
                      {employee.task_completion_rate}% ({employee.completed_tasks}/{employee.total_tasks})
                    </td>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">
                      {employee.violations} alerts
                    </td>
                    <td className="py-3 text-slate-700 dark:text-slate-300">{employee.logged_minutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {hasEmployees ? (
        <div className="grid gap-4 md:grid-cols-2">
          {employeeSeries.map((employee) => {
            const series = Array.isArray(employee.series) ? employee.series : [];
            const employeeName = employee.full_name || employee.email || 'Employee';

            return (
              <div key={employee.user_id} className="kpi-card h-[360px]">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{employeeName}</p>
                {employee.email ? <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{employee.email}</p> : null}
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
                  <div className="flex h-[82%] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
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
