import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { saveSession } from '../../lib/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const deviceIdentifier = `web-${navigator.userAgent.slice(0, 30)}-${window.location.host}`;
      const res = await api.post('/auth/login', {
        email: form.email,
        password: form.password,
        device_identifier: deviceIdentifier,
        device_name: 'Web Dashboard',
        os_version: navigator.platform
      });
      saveSession(res.data.access_token, res.data.user, res.data.refresh_token);
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-blue-200 flex items-center justify-center p-4">
      <form className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl" onSubmit={submit}>
        <h1 className="text-2xl font-semibold text-slate-900">Hybrid Workforce Intelligence</h1>
        <p className="text-sm text-slate-500 mt-1">Sign in to continue</p>
        <div className="mt-5 space-y-3">
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
          />
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
          />
        </div>
        {error ? <p className="text-sm text-red-600 mt-3">{error}</p> : null}
        <button className="mt-5 w-full rounded-lg bg-brand-500 text-white py-2.5" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
