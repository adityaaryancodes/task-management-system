import { formatClock, formatRelativeTime } from '../../utils/workspace';

export function CaptureCards({ items, now }) {
  if (!items.length) {
    return <p className="empty-state">No screenshots have been captured in this desktop session yet.</p>;
  }

  return (
    <div className="capture-grid">
      {items.map((item) => (
        <div className="capture-card" key={item.id}>
          <div className={`capture-preview ${item.error ? 'issue' : 'healthy'}`}>
            <div className="capture-screen" />
          </div>
          <div className="capture-copy">
            <p className="capture-time">{formatClock(item.at)}</p>
            <p className="capture-meta">{item.error || 'Screenshot queued and uploaded successfully.'}</p>
            <p className="capture-age">{formatRelativeTime(item.at, now)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
