import { SectionPanel } from '../components/common/SectionPanel';

export function ReportsPage({ status, trackedSecondsToday, activeSecondsToday, idleSecondsToday, completedTasks, inProgressTasks, tasks, appUsage, productivityScore, currentFocus, websiteSignal, currentTask }) {
  return (
    <div className="page-stack">
      <div className="report-layout">
        <SectionPanel eyebrow="Daily Summary" title="Workday report" subtitle="A concise summary that can later feed exports and scheduled reports.">
          <div className="report-grid">
            <div className="report-tile">
              <p className="report-label">Today's Work Time</p>
              <p className="report-value">{trackedSecondsToday}</p>
              <p className="report-copy">Active {activeSecondsToday} | Idle {idleSecondsToday}</p>
            </div>
            <div className="report-tile">
              <p className="report-label">Task Completion</p>
              <p className="report-value">{tasks.length ? `${completedTasks}/${tasks.length}` : '0/0'}</p>
              <p className="report-copy">{inProgressTasks} currently in progress</p>
            </div>
            <div className="report-tile">
              <p className="report-label">Top App</p>
              <p className="report-value">{appUsage[0]?.label || 'No activity yet'}</p>
              <p className="report-copy">{appUsage[0] ? appUsage[0].displayDuration : 'Waiting for more activity'}</p>
            </div>
            <div className="report-tile">
              <p className="report-label">Productivity Score</p>
              <p className="report-value">{productivityScore}%</p>
              <p className="report-copy">Weighted from activity ratio and completed tasks</p>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel eyebrow="Manager Summary" title="Narrative summary" subtitle="Copy-ready language for check-ins and status reviews." accent="peach">
          <div className="narrative-card">
            <p>
              {status.user?.full_name || status.user?.email} has logged {trackedSecondsToday} today with {activeSecondsToday} active time and {idleSecondsToday} idle time.
            </p>
            <p>
              The current focus signal is {currentFocus}{websiteSignal ? ` on ${websiteSignal}` : ''}, and the leading task is {currentTask?.title || 'not yet selected'}.
            </p>
            <p>
              Task progress shows {completedTasks} completed, {inProgressTasks} in progress, and a desktop productivity score of {productivityScore}% so far.
            </p>
          </div>
          <div className="export-row">
            <div className="export-tile">
              <p className="export-label">PDF Export</p>
              <p className="export-copy">UI ready for a future report generator.</p>
            </div>
            <div className="export-tile">
              <p className="export-label">CSV Export</p>
              <p className="export-copy">Can be wired to tracked activity and task data next.</p>
            </div>
            <div className="export-tile">
              <p className="export-label">Email Summary</p>
              <p className="export-copy">Prepared for scheduled weekly delivery later.</p>
            </div>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
