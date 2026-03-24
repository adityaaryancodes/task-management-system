import { useState } from 'react';

export function OrganizationSettingsPage() {
  const [settings, setSettings] = useState({
    workHours: '09:00 - 18:00',
    screenshotInterval: '15',
    idleThreshold: '5',
    allowedApps: 'Visual Studio Code, Chrome, Canva',
    blockedApps: 'YouTube, WhatsApp',
    trackingEnabled: true,
    retentionDays: '90',
    timezone: 'Asia/Kolkata'
  });
  const [message, setMessage] = useState('');

  function updateSetting(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function saveSettings(e) {
    e.preventDefault();
    setMessage('Settings UI is ready. Connect this form to an organization settings API to persist changes.');
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Configuration</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Organization Settings</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          Configure the operating rules for monitoring, retention, screenshots, and workforce policy controls.
        </p>
      </div>

      {message ? <div className="kpi-card text-sm text-brand-700 dark:text-brand-200">{message}</div> : null}

      <form className="grid gap-4 xl:grid-cols-2" onSubmit={saveSettings}>
        <div className="kpi-card space-y-4">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Work Rules</p>
          <input value={settings.workHours} onChange={(e) => updateSetting('workHours', e.target.value)} placeholder="Work hours" />
          <input value={settings.screenshotInterval} onChange={(e) => updateSetting('screenshotInterval', e.target.value)} placeholder="Screenshot interval (minutes)" />
          <input value={settings.idleThreshold} onChange={(e) => updateSetting('idleThreshold', e.target.value)} placeholder="Idle threshold (minutes)" />
          <input value={settings.timezone} onChange={(e) => updateSetting('timezone', e.target.value)} placeholder="Timezone" />
        </div>

        <div className="kpi-card space-y-4">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Policy Controls</p>
          <textarea
            rows={4}
            value={settings.allowedApps}
            onChange={(e) => updateSetting('allowedApps', e.target.value)}
            placeholder="Allowed apps"
          />
          <textarea
            rows={4}
            value={settings.blockedApps}
            onChange={(e) => updateSetting('blockedApps', e.target.value)}
            placeholder="Blocked apps"
          />
          <input value={settings.retentionDays} onChange={(e) => updateSetting('retentionDays', e.target.value)} placeholder="Data retention days" />
        </div>

        <div className="kpi-card xl:col-span-2">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tracking Controls</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Enable or pause desktop tracking at an organization level.</p>
            </div>
            <button
              type="button"
              className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                settings.trackingEnabled
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
              onClick={() => updateSetting('trackingEnabled', !settings.trackingEnabled)}
            >
              Tracking {settings.trackingEnabled ? 'enabled' : 'disabled'}
            </button>
          </div>
          <button type="submit" className="mt-4 rounded-2xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
            Save settings
          </button>
        </div>
      </form>
    </div>
  );
}
