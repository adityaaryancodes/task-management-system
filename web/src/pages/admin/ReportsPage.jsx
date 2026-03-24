import { useState } from 'react';
import { KpiCard } from '../../components/common/KpiCard';

const REPORTS = [
  { title: 'Daily report', description: 'Attendance, productivity, and policy summary for the current day.' },
  { title: 'Weekly report', description: 'Cross-team trends for time, output, and utilization.' },
  { title: 'Employee performance', description: 'Task completion, score trends, and coaching signals by employee.' },
  { title: 'Attendance report', description: 'Logins, session durations, and attendance exceptions.' },
  { title: 'App usage report', description: 'Work application focus, usage mix, and idle-heavy windows.' },
  { title: 'Policy violations report', description: 'Unauthorized apps, repeated breaches, and resolution history.' }
];

export function ReportsPage() {
  const [message, setMessage] = useState('');

  function triggerExport(type, format) {
    setMessage(`${type} export prepared for ${format}. Wire this button to your report generation service next.`);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Reporting</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Reports</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          Export-ready reporting surfaces for ops, management, and customer stakeholders.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard title="Report Types" value={REPORTS.length} subtitle="Pre-built executive and operational exports" />
        <KpiCard title="Formats" value="3" subtitle="PDF, CSV, and Excel export targets" />
        <KpiCard title="Status" value="UI Ready" subtitle="Connect generation jobs to activate exports" />
      </div>

      {message ? <div className="kpi-card text-sm text-brand-700 dark:text-brand-200">{message}</div> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {REPORTS.map((report) => (
          <div key={report.title} className="kpi-card">
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{report.title}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{report.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['PDF', 'CSV', 'Excel'].map((format) => (
                <button
                  key={format}
                  type="button"
                  className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  onClick={() => triggerExport(report.title, format)}
                >
                  Export {format}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
