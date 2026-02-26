import { useEffect, useState } from 'react';
import api from '../../lib/api';

export function MyTasksPage() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    api.get('/tasks').then((res) => setTasks(res.data.data || []));
  }, []);

  return (
    <div className="kpi-card">
      <h2 className="text-xl font-semibold mb-4">My Tasks</h2>
      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="border rounded-lg p-3 border-slate-200">
            <p className="font-medium">{task.title}</p>
            <p className="text-sm text-slate-600">{task.description || 'No description'}</p>
            <p className="text-xs text-slate-500 mt-1">{task.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
