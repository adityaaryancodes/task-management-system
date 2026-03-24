import { MiniMetric } from '../components/common/MiniMetric';
import { SectionPanel } from '../components/common/SectionPanel';

export function TasksPage({
  currentTask,
  completedTasks,
  taskCompletionRatio,
  isEmployee,
  tasksLoading,
  onReloadTasks,
  taskError,
  tasks,
  updatingTaskId,
  onUpdateTaskStatus
}) {
  return (
    <div className="page-stack">
      <div className="tasks-layout">
        <SectionPanel
          eyebrow="Primary Task"
          title={currentTask?.title || 'No active task selected'}
          subtitle={currentTask?.description || 'Start a task or wait for new work assignments from the manager panel.'}
          accent="blue"
        >
          <div className="task-highlight">
            <MiniMetric label="Due date" value={currentTask?.due_date ? new Date(currentTask.due_date).toLocaleDateString() : 'Not set'} detail="Target completion date" />
            <MiniMetric
              label="Status"
              value={currentTask?.status ? currentTask.status.replace('_', ' ') : 'No task'}
              detail="Current progress stage"
              tone={currentTask?.status === 'completed' ? 'positive' : currentTask?.status === 'in_progress' ? 'warning' : 'neutral'}
            />
            <MiniMetric label="Completed" value={`${completedTasks}`} detail={`${taskCompletionRatio}% of assigned work`} tone="positive" />
          </div>
        </SectionPanel>

        <SectionPanel
          eyebrow="Task Board"
          title="Assigned work"
          subtitle="Move work forward quickly without opening the browser dashboard."
          action={
            isEmployee ? (
              <button className="ghost-button compact" onClick={onReloadTasks} disabled={tasksLoading}>
                {tasksLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            ) : null
          }
          accent="peach"
        >
          {!isEmployee ? <p className="empty-state">Task management for admins and managers stays in the web dashboard.</p> : null}
          {taskError ? <p className="inline-error">{taskError}</p> : null}
          {isEmployee && !tasks.length ? <p className="empty-state">No tasks assigned yet. Your manager can assign tasks from the web dashboard.</p> : null}
          {isEmployee ? (
            <div className="task-board">
              {tasks.map((task) => (
                <div className="task-card" key={task.id}>
                  <div className="task-card-head">
                    <p className="task-card-title">{task.title}</p>
                    <span className={`badge ${task.status === 'completed' ? 'status-positive' : task.status === 'in_progress' ? 'status-warning' : 'status-neutral'}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="task-card-copy">{task.description || 'No description provided.'}</p>
                  <p className="task-card-meta">Due {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}</p>
                  <div className="task-card-actions">
                    <button
                      className="ghost-button compact"
                      disabled={updatingTaskId === task.id || task.status === 'in_progress'}
                      onClick={() => onUpdateTaskStatus(task.id, 'in_progress')}
                    >
                      Mark In Progress
                    </button>
                    <button
                      className="primary-button compact"
                      disabled={updatingTaskId === task.id || task.status === 'completed'}
                      onClick={() => onUpdateTaskStatus(task.id, 'completed')}
                    >
                      Mark Completed
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </SectionPanel>
      </div>
    </div>
  );
}
