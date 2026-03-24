import { CaptureCards } from '../components/common/CaptureCards';
import { MiniMetric } from '../components/common/MiniMetric';
import { SectionPanel } from '../components/common/SectionPanel';
import { formatClock, formatRelativeTime } from '../utils/workspace';

export function ScreenshotsPage({ status, lastScreenshotState, screenshotFeed, now }) {
  return (
    <div className="page-stack">
      <div className="metric-row">
        <MiniMetric
          label="Last Capture"
          value={status.lastScreenshotAt ? formatClock(status.lastScreenshotAt) : 'Not yet'}
          detail={status.lastScreenshotAt ? formatRelativeTime(status.lastScreenshotAt, now) : 'Tracking needs to be active'}
          tone={status.lastScreenshotError ? 'warning' : 'positive'}
        />
        <MiniMetric label="Capture Count" value={String(screenshotFeed.length)} detail="Screenshots recorded in this session" />
        <MiniMetric
          label="Capture Health"
          value={lastScreenshotState}
          detail={status.lastScreenshotError || 'Latest screenshot upload completed without error'}
          tone={status.lastScreenshotError ? 'warning' : 'positive'}
        />
      </div>

      <SectionPanel eyebrow="Capture Stream" title="Screenshot timeline" subtitle="Recent captures recorded by the desktop agent." accent="mint">
        <CaptureCards items={screenshotFeed} now={now} />
      </SectionPanel>
    </div>
  );
}
