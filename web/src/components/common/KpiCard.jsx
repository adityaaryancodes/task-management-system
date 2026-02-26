export function KpiCard({ title, value, subtitle }) {
  return (
    <div className="kpi-card">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
      {subtitle ? <p className="text-xs text-slate-400 mt-2">{subtitle}</p> : null}
    </div>
  );
}
