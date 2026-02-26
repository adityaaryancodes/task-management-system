import { useEffect, useMemo, useState } from 'react';

export function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ tracking: false, loggedIn: false, user: null });
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [taskError, setTaskError] = useState('');
  const [tasksLoading, setTasksLoading] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState('');

  const isEmployee = useMemo(() => status.user?.role === 'employee', [status.user]);

  async function loadTasks(silent = false) {
    if (!isEmployee) return;
    if (!silent) setTasksLoading(true);
    setTaskError('');
    try {
      const res = await window.agent.getTasks();
      if (res.ok) {
        setTasks(res.data || []);
      } else {
        setTaskError(res.message || 'Failed to load tasks');
      }
    } catch {
      setTaskError('Failed to load tasks');
    } finally {
      if (!silent) setTasksLoading(false);
    }
  }

  useEffect(() => {
    window.agent.getStatus().then((next) => {
      setStatus(next);
    });

    window.agent.onStatus((next) => {
      setStatus(next);
      if (!next.loggedIn) {
        setTasks([]);
        setTaskError('');
      }
    });
  }, []);

  useEffect(() => {
    if (status.loggedIn && isEmployee) {
      loadTasks();
      const intervalId = setInterval(() => loadTasks(true), 45000);
      return () => clearInterval(intervalId);
    }
  }, [status.loggedIn, isEmployee]);

  async function login(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await window.agent.login({ email, password });
      setStatus(res.state);
      if (res.state?.user?.role === 'employee') {
        await loadTasks();
      }
    } finally {
      setLoading(false);
    }
  }

  async function setTaskStatus(taskId, statusValue) {
    setUpdatingTaskId(taskId);
    try {
      const res = await window.agent.updateTask(taskId, statusValue);
      if (res.ok) {
        await loadTasks();
      } else {
        setTaskError(res.message || 'Failed to update task');
      }
    } finally {
      setUpdatingTaskId('');
    }
  }

  return (
    <div className="shell">
      <div className={`card ${status.loggedIn ? 'wide' : ''}`}>
        <h1>Hybrid Workforce Agent</h1>
        <p className={status.tracking ? 'pill on' : 'pill off'}>Tracking Active: {status.tracking ? 'Yes' : 'No'}</p>

        {!status.loggedIn ? (
          <form onSubmit={login}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Work email" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
            <button disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
          </form>
        ) : (
          <div className="actions">
            <div className="meta">
              Signed in as {status.user?.full_name || status.user?.email} ({status.user?.role})
            </div>
            {status.lastScreenshotAt ? (
              <p className="meta">Last screenshot upload: {new Date(status.lastScreenshotAt).toLocaleTimeString()}</p>
            ) : null}
            {status.lastScreenshotError ? <p className="task-error">{status.lastScreenshotError}</p> : null}

            {isEmployee ? (
              <div className="task-panel">
                <div className="task-header">
                  <h2>My Assigned Tasks</h2>
                  <button className="small secondary" onClick={() => loadTasks()} disabled={tasksLoading}>
                    {tasksLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
                {taskError ? <p className="task-error">{taskError}</p> : null}
                {!tasks.length ? <p className="task-empty">No tasks assigned yet.</p> : null}
                <div className="task-list">
                  {tasks.map((task) => (
                    <div className="task-item" key={task.id}>
                      <p className="task-title">{task.title}</p>
                      <p className="task-desc">{task.description || 'No description'}</p>
                      <p className="task-meta">
                        Status: <b>{task.status}</b> | Due:{' '}
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}
                      </p>
                      <div className="task-actions">
                        <button
                          className="small secondary"
                          disabled={updatingTaskId === task.id || task.status === 'in_progress'}
                          onClick={() => setTaskStatus(task.id, 'in_progress')}
                        >
                          Mark In Progress
                        </button>
                        <button
                          className="small"
                          disabled={updatingTaskId === task.id || task.status === 'completed'}
                          onClick={() => setTaskStatus(task.id, 'completed')}
                        >
                          Mark Completed
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="task-panel">
                <p className="task-empty">Admin and manager operations are available in the web dashboard.</p>
              </div>
            )}

            <button onClick={() => window.agent.startTracking()}>Start Tracking</button>
            <button className="secondary" onClick={() => window.agent.stopTracking()}>
              Stop Tracking
            </button>
            <button className="secondary" onClick={() => window.agent.logout()}>
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
