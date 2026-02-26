import { useEffect, useState } from 'react';
import api from '../../lib/api';

export function TaskManagementPage() {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    assignee_user_id: '',
    title: '',
    description: '',
    due_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updatingTaskId, setUpdatingTaskId] = useState('');

  async function loadTasks() {
    api.get('/tasks').then((res) => setTasks(res.data.data || []));
  }

  async function loadEmployees() {
    api.get('/users?role=employee&limit=200').then((res) => setEmployees(res.data.data || []));
  }

  useEffect(() => {
    loadTasks();
    loadEmployees();
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function assignTask(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (!form.assignee_user_id) {
        setError('Select an employee to assign this task.');
        setLoading(false);
        return;
      }
      if (form.title.trim().length < 2) {
        setError('Task title must be at least 2 characters.');
        setLoading(false);
        return;
      }

      const payload = {
        assignee_user_id: form.assignee_user_id,
        title: form.title.trim(),
        description: form.description.trim(),
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null
      };

      await api.post('/tasks', payload);
      setSuccess('Task assigned successfully.');
      setForm({ assignee_user_id: '', title: '', description: '', due_date: '' });
      await loadTasks();
    } catch (err) {
      const data = err?.response?.data;
      if (Array.isArray(data?.errors) && data.errors.length) {
        setError(data.errors.join(' | '));
      } else {
        setError(data?.message || 'Failed to assign task');
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateTaskStatus(taskId, status) {
    setError('');
    setSuccess('');
    setUpdatingTaskId(taskId);
    try {
      await api.patch(`/tasks/${taskId}`, { status });
      setSuccess('Task status updated.');
      await loadTasks();
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.message || 'Failed to update task status');
    } finally {
      setUpdatingTaskId('');
    }
  }

  const employeeMap = employees.reduce((acc, item) => {
    acc[item.id] = item.full_name;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="kpi-card">
        <h2 className="text-xl font-semibold mb-4">Assign Task</h2>
        <form className="grid md:grid-cols-2 gap-3" onSubmit={assignTask}>
          <select
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
            value={form.assignee_user_id}
            onChange={(e) => updateField('assignee_user_id', e.target.value)}
            required
          >
            <option value="">Select employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name} ({employee.email})
              </option>
            ))}
          </select>
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
            placeholder="Task title"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            required
          />
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2 md:col-span-2"
            placeholder="Description"
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
          />
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
            type="date"
            value={form.due_date}
            onChange={(e) => updateField('due_date', e.target.value)}
          />
          <div className="flex items-center">
            <button className="rounded-lg bg-brand-500 text-white px-4 py-2 text-sm" disabled={loading}>
              {loading ? 'Assigning...' : 'Assign Task'}
            </button>
          </div>
          {error ? <p className="md:col-span-2 text-sm text-red-600">{error}</p> : null}
          {success ? <p className="md:col-span-2 text-sm text-green-700">{success}</p> : null}
        </form>
      </div>

      <div className="kpi-card">
        <h2 className="text-xl font-semibold mb-4">Task Management</h2>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="border border-slate-200 rounded-lg p-3">
              <p className="font-medium">{task.title}</p>
              <p className="text-sm text-slate-600 mt-1">{task.description || 'No description'}</p>
              <p className="text-xs text-slate-500 mt-2">
                Assignee: {employeeMap[task.assignee_user_id] || task.assignee_user_id}
              </p>
              <p className="text-xs text-slate-500">
                Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <select
                  className="border border-slate-300 rounded px-2 py-1 text-sm"
                  defaultValue={task.status}
                  onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                  disabled={updatingTaskId === task.id}
                >
                  <option value="todo">todo</option>
                  <option value="in_progress">in_progress</option>
                  <option value="completed">completed</option>
                </select>
                <span className="text-xs text-slate-500">Current: {task.status}</span>
              </div>
            </div>
          ))}
          {!tasks.length ? <p className="text-sm text-slate-500">No tasks yet.</p> : null}
        </div>
      </div>
    </div>
  );
}
