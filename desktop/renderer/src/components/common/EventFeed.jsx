import { formatRelativeTime } from '../../utils/workspace';

export function EventFeed({ items, now, emptyMessage }) {
  if (!items.length) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <div className="feed-list">
      {items.map((item) => (
        <div className="feed-item" key={item.id}>
          <span className={`feed-pill ${item.tone || 'status-neutral'}`}>{item.badge}</span>
          <div className="feed-copy">
            <p className="feed-title">{item.title}</p>
            <p className="feed-meta">{item.subtitle}</p>
          </div>
          <p className="feed-time">{item.absoluteTime || formatRelativeTime(item.at, now)}</p>
        </div>
      ))}
    </div>
  );
}
