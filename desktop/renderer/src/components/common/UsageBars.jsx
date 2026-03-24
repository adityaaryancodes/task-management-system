import { formatCompactDuration } from '../../utils/workspace';

export function UsageBars({ items, emptyMessage }) {
  if (!items.length) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  const maxSeconds = Math.max(...items.map((item) => item.seconds), 1);

  return (
    <div className="usage-list">
      {items.map((item) => (
        <div className="usage-row" key={item.label}>
          <div className="usage-copy">
            <p className="usage-label">{item.label}</p>
            <p className="usage-meta">{formatCompactDuration(item.seconds)}</p>
          </div>
          <div className="usage-track">
            <div className="usage-fill" style={{ width: `${Math.max(10, (item.seconds / maxSeconds) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
