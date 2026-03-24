export function MiniMetric({ label, value, detail, tone = 'neutral' }) {
  return (
    <div className={`mini-metric ${tone}`}>
      <p className="mini-label">{label}</p>
      <p className="mini-value">{value}</p>
      <p className="mini-detail">{detail}</p>
    </div>
  );
}
