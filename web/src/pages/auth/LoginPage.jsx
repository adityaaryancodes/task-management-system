import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { clearSession, saveSession } from '../../lib/auth';
import { useTheme } from '../../components/theme/ThemeProvider';

export function LoginPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function resetSignIn() {
    clearSession();
    setForm({ email: '', password: '' });
    setError('');
  }

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
    <div
      className={`flex min-h-screen items-center justify-center p-4 transition-colors duration-300 ${
        isDark
          ? 'bg-[radial-gradient(circle_at_top,_#111827_0%,_#020617_52%,_#01030f_100%)]'
          : 'bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#edf4ff_44%,_#d8e6ff_100%)]'
      }`}
    >
      <form
        className={`w-full max-w-md rounded-[28px] border p-7 shadow-2xl backdrop-blur transition-colors duration-300 ${
          isDark
            ? 'border-slate-800 bg-slate-900/90'
            : 'border-white/80 bg-white/88 shadow-[0_24px_60px_rgba(148,163,184,0.22)]'
        }`}
        onSubmit={submit}
      >
        <div className="flex items-center justify-between gap-3">
          <p className={`text-xs uppercase tracking-[0.22em] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Control Center</p>
          <button
            type="button"
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              isDark
                ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'border-slate-200 bg-white/90 text-slate-700 hover:bg-white'
            }`}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
        <h1 className={`mt-3 text-3xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Hybrid Workforce Intelligence</h1>
        <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Sign in to continue</p>
        <div className="mt-5 space-y-3">
          <input
            className="w-full"
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
          />
          <input
            className="w-full"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
          />
        </div>
        {error ? <p className={`mt-3 text-sm ${isDark ? 'text-red-300' : 'text-red-600'}`}>{error}</p> : null}
        <div className="mt-5 flex gap-3">
          <button className="flex-1 rounded-xl bg-brand-500 py-2.5 text-white hover:bg-brand-700" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <button
            type="button"
            className={`rounded-xl border px-4 py-2.5 transition ${
              isDark
                ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'border-slate-200 bg-white/90 text-slate-700 hover:bg-white'
            }`}
            onClick={resetSignIn}
            disabled={loading}
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
