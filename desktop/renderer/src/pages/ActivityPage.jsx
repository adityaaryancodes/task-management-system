import { EventFeed } from '../components/common/EventFeed';
import { MiniMetric } from '../components/common/MiniMetric';
import { SectionPanel } from '../components/common/SectionPanel';
import { UsageBars } from '../components/common/UsageBars';
import { formatClock } from '../utils/workspace';

export function ActivityPage({ activeSecondsToday, idleSecondsToday, currentFocus, currentFocusDetail, websiteSignal, appUsage, websiteUsage, activityFeed, now }) {
  const activityEvents = activityFeed.map((item) => ({
    ...item,
    absoluteTime: formatClock(item.at)
  }));

  return (
    <div className="page-stack">
      <div className="metric-row">
        <MiniMetric label="Active Time" value={activeSecondsToday} detail="Productive activity captured today" tone="positive" />
        <MiniMetric label="Idle Time" value={idleSecondsToday} detail="System inactivity accumulated today" tone={idleSecondsToday > activeSecondsToday ? 'warning' : 'neutral'} />
        <MiniMetric label="Current App" value={currentFocus} detail={currentFocusDetail || 'Foreground window title signal'} />
        <MiniMetric label="Website Signal" value={websiteSignal || 'No browser signal'} detail="Derived from browser window titles" />
      </div>

      <div className="dashboard-grid">
        <SectionPanel eyebrow="Apps" title="App usage" subtitle="Which windows are taking most of the day.">
          <UsageBars items={appUsage} emptyMessage="App usage will fill in after a few tracking intervals." />
        </SectionPanel>
        <SectionPanel eyebrow="Browser" title="Website title signals" subtitle="Best-effort page hints from browser window titles." accent="mint">
          <UsageBars items={websiteUsage} emptyMessage="Open Chrome, Edge, Brave, or Firefox to see browser title signals here." />
        </SectionPanel>
        <SectionPanel eyebrow="Timeline" title="Live activity feed" subtitle="Foreground changes and idle moments in order." accent="peach">
          <EventFeed items={activityEvents} now={now} emptyMessage="Live activity will appear here once tracking begins." />
        </SectionPanel>
      </div>
    </div>
  );
}
