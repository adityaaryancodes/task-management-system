import { useEffect, useState } from 'react';
import api from '../../lib/api';

export function EmployeeListPage() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadEmployees() {
    api.get('/users?role=employee').then((res) => setEmployees(res.data.data || []));
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let out = '';
    for (let i = 0; i < 12; i += 1) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    updateField('password', out);
  }

  async function createEmployee(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password
      };

      if (payload.full_name.length < 2) {
        setError('Full name must be at least 2 characters.');
        setLoading(false);
        return;
      }
      if (payload.password.length < 8) {
        setError('Password must be at least 8 characters.');
        setLoading(false);
        return;
      }

      await api.post('/users', {
        full_name: payload.full_name,
        email: payload.email,
        password: payload.password,
        role: 'employee'
      });
      setSuccess('Employee created. Share the email and password with the employee.');
      setForm({ full_name: '', email: '', password: '' });
      await loadEmployees();
    } catch (err) {
      const data = err?.response?.data;
      if (Array.isArray(data?.errors) && data.errors.length) {
        setError(data.errors.join(' | '));
      } else {
        setError(data?.message || 'Failed to create employee');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="kpi-card">
        <h2 className="text-xl font-semibold mb-4">Add Employee</h2>
        <form className="grid md:grid-cols-2 gap-3" onSubmit={createEmployee}>
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
            placeholder="Full name"
            value={form.full_name}
            onChange={(e) => updateField('full_name', e.target.value)}
            required
          />
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
            placeholder="Work email"
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            required
          />
          <div className="md:col-span-2 flex gap-2">
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="Temporary password"
              type="text"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              required
            />
            <button type="button" className="px-3 rounded-lg border border-slate-300 text-sm" onClick={generatePassword}>
              Generate
            </button>
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <button className="rounded-lg bg-brand-500 text-white px-4 py-2 text-sm" disabled={loading}>
              {loading ? 'Creating...' : 'Create Employee'}
            </button>
            <p className="text-xs text-slate-500">Role will be set to employee. Password must be 8+ characters.</p>
          </div>
          {error ? <p className="md:col-span-2 text-sm text-red-600">{error}</p> : null}
          {success ? <p className="md:col-span-2 text-sm text-green-700">{success}</p> : null}
        </form>
      </div>

      <div className="kpi-card">
        <h2 className="text-xl font-semibold mb-4">Employee List</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="pb-3">Name</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-t border-slate-200">
                  <td className="py-3">{e.full_name}</td>
                  <td>{e.email}</td>
                  <td>{e.role}</td>
                  <td>{new Date(e.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
