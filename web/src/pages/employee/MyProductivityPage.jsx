import { useEffect, useState } from 'react';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../lib/api';

export function MyProductivityPage() {
  const [series, setSeries] = useState([]);

  useEffect(() => {
    api.get('/analytics/productivity?scope=me').then((res) => setSeries(res.data.data || []));
  }, []);

  return (
    <div className="kpi-card h-[460px]">
      <h2 className="text-xl font-semibold mb-4">My Productivity Analytics</h2>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={series}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="active_minutes" stroke="#0a5dc2" strokeWidth={2} />
          <Line type="monotone" dataKey="idle_minutes" stroke="#f97316" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
