import { useEffect, useRef, useState } from 'react';
import api from '../../lib/api';

export function ScreenshotViewerPage() {
  const [shots, setShots] = useState([]);
  const [urls, setUrls] = useState({});
  const [pending, setPending] = useState({});
  const [deleting, setDeleting] = useState({});
  const [error, setError] = useState('');
  const loadedUrlIdsRef = useRef(new Set());

  async function loadShotUrl(id, options = {}) {
    const { silent = false } = options;
    setPending((s) => ({ ...s, [id]: true }));

    try {
      const res = await api.get(`/screenshots/${id}/url`);
      setUrls((s) => ({ ...s, [id]: res.data.signed_url }));
      loadedUrlIdsRef.current.add(id);
      return true;
    } catch (err) {
      if (!silent) {
        setError(err?.response?.data?.message || 'Failed to load screenshot');
      }
      return false;
    } finally {
      setPending((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
    }
  }

  async function removeShot(id) {
    const confirmed = window.confirm('Delete this screenshot permanently?');
    if (!confirmed) return;

    setDeleting((s) => ({ ...s, [id]: true }));
    try {
      await api.delete(`/screenshots/${id}`);

      loadedUrlIdsRef.current.delete(id);
      setShots((prev) => prev.filter((shot) => shot.id !== id));
      setUrls((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete screenshot');
    } finally {
      setDeleting((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
    }
  }

  useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    async function load() {
      try {
        if (!cancelled) setError('');
        const res = await api.get('/screenshots');
        const list = res.data.data || [];
        if (cancelled) return;

        setShots(list);
        if (!list.length) return;

        const toLoad = list.filter((shot) => !loadedUrlIdsRef.current.has(shot.id));
        if (!toLoad.length) return;

        const results = await Promise.allSettled(toLoad.map((shot) => loadShotUrl(shot.id, { silent: true })));
        if (cancelled) return;

        const failed = results.filter((r) => r.status === 'fulfilled' && !r.value).length + results.filter((r) => r.status === 'rejected').length;
        if (failed > 0) {
          setError(`Loaded ${toLoad.length - failed}/${toLoad.length} new screenshots. Some previews could not be loaded.`);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Failed to load screenshots');
        }
      }
    }

    load();
    intervalId = setInterval(load, 15000);
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Screenshot Viewer</h2>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shots.map((shot) => (
          <div key={shot.id} className="kpi-card">
            <p className="text-sm font-medium text-slate-800">{shot.full_name || shot.email || shot.user_id}</p>
            <p className="text-xs text-slate-500">{shot.email || 'Employee screenshot'}</p>
            <p className="text-sm text-slate-500">{new Date(shot.captured_at).toLocaleString()}</p>
            {urls[shot.id] ? (
              <img className="mt-3 w-full h-44 object-cover rounded-lg border border-slate-200 bg-slate-100" src={urls[shot.id]} alt="screenshot preview" loading="lazy" />
            ) : (
              <div className="mt-3 w-full h-44 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-sm text-slate-500">
                {pending[shot.id] ? 'Loading screenshot...' : 'Screenshot preview unavailable'}
              </div>
            )}
            <div className="mt-2 flex items-center gap-2">
              <button
                className="text-sm px-3 py-1.5 rounded bg-brand-500 text-white disabled:opacity-60"
                onClick={() => loadShotUrl(shot.id)}
                disabled={Boolean(pending[shot.id]) || Boolean(deleting[shot.id])}
              >
                {pending[shot.id] ? 'Loading...' : urls[shot.id] ? 'Refresh URL' : 'Retry'}
              </button>
              <button
                className="text-sm px-3 py-1.5 rounded bg-red-600 text-white disabled:opacity-60"
                onClick={() => removeShot(shot.id)}
                disabled={Boolean(deleting[shot.id])}
              >
                {deleting[shot.id] ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
