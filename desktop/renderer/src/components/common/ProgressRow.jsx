export function ProgressRow({ label, value, percent, tone = 'blue' }) {
  return (
    <div className="progress-row">
      <div className="progress-copy">
        <p className="progress-label">{label}</p>
        <p className="progress-value">{value}</p>
      </div>
      <div className="progress-track">
        <div className={`progress-fill ${tone}`} style={{ width: `${Math.max(6, Math.min(100, percent || 0))}%` }} />
      </div>
    </div>
  );
}
