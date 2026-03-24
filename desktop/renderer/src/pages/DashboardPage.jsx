import { EventFeed } from '../components/common/EventFeed';
import { MiniMetric } from '../components/common/MiniMetric';
import { ProgressRow } from '../components/common/ProgressRow';
import { SectionPanel } from '../components/common/SectionPanel';

export function DashboardPage({
  workTimer,
  productivityScore,
  currentFocus,
  currentFocusDetail,
  currentTask,
  status,
  syncStateLabel,
  now,
  onToggleTracking,
  onToggleBreak,
  canToggleBreak,
  proofName,
  proofStatus,
  onProofSelection,
  activeSecondsToday,
  idleSecondsToday,
  activeRatio,
  completedTasks,
  tasks,
  taskCompletionRatio,
  websiteSignal,
  isEmployee,
  tasksLoading,
  onReloadTasks,
  taskError,
  activityFeed
}) {
  return (
    <div className="page-stack">
      <section className="hero-surface">
        <div className="hero-main">
          <div className="hero-copy">
            <p className="eyebrow">Today&apos;s Pulse</p>
            <h2 className="hero-title">Stay focused without leaving the desktop.</h2>
            <p className="hero-description">
              Watch work time, current focus, sync health, and task movement from one employee control center.
            </p>
          </div>

          <div className="hero-stat-strip">
            <MiniMetric label="Work Timer" value={workTimer} detail="Current attendance session" tone="positive" />
            <MiniMetric label="Current App" value={currentFocus} detail={currentFocusDetail || 'Foreground app detected by the tracker'} />
            <MiniMetric
              label="Current Task"
              value={currentTask?.title || 'No active task'}
              detail={currentTask?.due_date ? `Due ${new Date(currentTask.due_date).toLocaleDateString()}` : 'Pick a task from the assigned list'}
            />
            <MiniMetric
              label="Sync Status"
              value={syncStateLabel}
              detail={status.lastSyncAt ? `Last sync ${Math.max(0, Math.floor((now - new Date(status.lastSyncAt).getTime()) / 60000))}m ago` : status.syncError || 'Waiting for a sync cycle'}
              tone={status.syncStatus === 'connected' ? 'positive' : status.syncStatus === 'syncing' || status.syncStatus === 'paused' ? 'warning' : 'neutral'}
            />
          </div>
        </div>

        <div className="hero-aside">
          <div className="score-orbit">
            <div
              className="score-ring"
              style={{
                background: `conic-gradient(#0a5dc2 ${productivityScore}%, rgba(15,23,42,0.08) ${productivityScore}% 100%)`
              }}
            >
              <div className="score-ring-inner">
                <span className="score-value">{productivityScore}%</span>
                <span className="score-caption">Productivity</span>
              </div>
            </div>
          </div>
          <div className="quick-actions">
            <button className="primary-button" onClick={onToggleTracking}>
              {status.tracking ? 'Pause Tracking' : 'Start Tracking'}
            </button>
            <button className="ghost-button" onClick={onToggleBreak} disabled={!canToggleBreak}>
              {status.breakActive ? 'Resume Work' : 'Take Break'}
            </button>
            <label className="proof-dropzone">
              <span className="proof-label">Upload work proof</span>
              <span className="proof-copy">{proofName || 'Attach a file to keep evidence close to the workday.'}</span>
              {proofStatus ? <span className="support-text">{proofStatus}</span> : null}
              <input type="file" className="hidden-input" onChange={onProofSelection} />
            </label>
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        <SectionPanel eyebrow="Momentum" title="Workday balance" subtitle="See whether the day is leaning active, idle, or blocked.">
          <div className="progress-stack">
            <ProgressRow label="Active time" value={activeSecondsToday} percent={activeRatio} tone="blue" />
            <ProgressRow label="Idle time" value={idleSecondsToday} percent={100 - activeRatio} tone="amber" />
            <ProgressRow label="Task completion" value={`${completedTasks}/${tasks.length || 0}`} percent={taskCompletionRatio} tone="green" />
          </div>
        </SectionPanel>

        <SectionPanel eyebrow="Focus" title="Current focus signal" subtitle="Foreground app, browser signal, and last activity update.">
          <div className="focus-stack">
            <div className="focus-card">
              <p className="focus-label">Active app</p>
              <p className="focus-value">{currentFocus}</p>
            </div>
            <div className="focus-card">
              <p className="focus-label">Browser signal</p>
              <p className="focus-value">{websiteSignal || 'No browser activity yet'}</p>
            </div>
            <div className="focus-card">
              <p className="focus-label">Last movement</p>
              <p className="focus-value">{status.lastActivityAt ? `${Math.max(0, Math.floor((now - new Date(status.lastActivityAt).getTime()) / 1000))}s ago` : 'Waiting for activity'}</p>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel
          eyebrow="Execution"
          title="Priority tasks"
          subtitle="The next items most likely to need attention."
          action={
            isEmployee ? (
              <button className="ghost-button compact" onClick={onReloadTasks} disabled={tasksLoading}>
                {tasksLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            ) : null
          }
        >
          {!isEmployee ? <p className="empty-state">Task execution for admins and managers stays in the web dashboard.</p> : null}
          {taskError ? <p className="inline-error">{taskError}</p> : null}
          {isEmployee && !tasks.length ? <p className="empty-state">No tasks assigned yet. Your manager can push work from the web dashboard.</p> : null}
          {isEmployee ? (
            <div className="priority-list">
              {tasks.slice(0, 3).map((task) => (
                <div className="priority-item" key={task.id}>
                  <div className="priority-head">
                    <p className="priority-title">{task.title}</p>
                    <span className={`badge ${task.status === 'completed' ? 'status-positive' : task.status === 'in_progress' ? 'status-warning' : 'status-neutral'}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="priority-copy">{task.description || 'No description provided.'}</p>
                  <p className="priority-meta">Due {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}</p>
                </div>
              ))}
            </div>
          ) : null}
        </SectionPanel>

        <SectionPanel eyebrow="Signals" title="Recent activity" subtitle="Foreground app switches and idle events from this session." accent="mint">
          <EventFeed items={activityFeed.slice(0, 6)} now={now} emptyMessage="Live activity will appear here once tracking begins." />
        </SectionPanel>
      </div>
    </div>
  );
}
