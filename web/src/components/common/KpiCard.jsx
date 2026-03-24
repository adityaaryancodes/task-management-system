import { useTheme } from '../theme/ThemeProvider';

export function KpiCard({ title, value, subtitle }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="kpi-card">
      <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
      <p className={`mt-1 break-words text-2xl font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{value}</p>
      {subtitle ? <p className={`mt-2 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{subtitle}</p> : null}
    </div>
  );
}
