export const VIEW_META = {
  dashboard: {
    label: 'Dashboard',
    hint: 'Today at a glance',
    eyebrow: 'Workday Command',
    title: 'Focus cockpit for the day',
    description: 'Track work time, app focus, proof uploads, and task movement from one desktop workspace.'
  },
  tasks: {
    label: 'Tasks',
    hint: 'Assigned work',
    eyebrow: 'Execution',
    title: 'Assigned work and due dates',
    description: 'Keep priorities visible, update progress quickly, and reduce context switching during the day.'
  },
  activity: {
    label: 'Activity',
    hint: 'Apps and browser signals',
    eyebrow: 'Activity Intelligence',
    title: 'Live app and browser awareness',
    description: 'Surface active apps, browser title signals, idle windows, and recent movement in one timeline.'
  },
  screenshots: {
    label: 'Screenshots',
    hint: 'Capture timeline',
    eyebrow: 'Evidence Stream',
    title: 'Screenshot health and recent captures',
    description: 'Review when the agent captured the screen and spot upload issues without leaving the desktop app.'
  },
  reports: {
    label: 'Reports',
    hint: 'Daily summary',
    eyebrow: 'Reporting',
    title: 'Daily summary and manager-ready notes',
    description: 'Translate tracked activity into simple summaries that can later power PDF, CSV, or email exports.'
  },
  settings: {
    label: 'Settings',
    hint: 'Tracking controls',
    eyebrow: 'Controls',
    title: 'Tracking controls and desktop rules',
    description: 'Manage start and pause behavior, inspect desktop defaults, and keep the agent healthy.'
  }
};

export const DESKTOP_SETTINGS = [
  {
    label: 'Auto start on boot',
    value: 'Enabled',
    hint: 'The agent is already configured to launch with Windows so tracking can resume without manual setup.'
  },
  {
    label: 'Idle detection threshold',
    value: '60 sec',
    hint: 'Idle time begins once the machine has been inactive for one minute.'
  },
  {
    label: 'Screenshot cadence',
    value: 'Every 15 min',
    hint: 'Automatic screenshots are captured while tracking is active and uploaded when sync is available.'
  },
  {
    label: 'Offline sync',
    value: 'Queue and retry',
    hint: 'Activity is queued locally and sent later if the connection drops.'
  }
];

export const WORKSPACE_STORAGE_KEY = 'hwa-desktop-workspace-v2';

export function getVisibleNavItems(isEmployee) {
  const entries = Object.entries(VIEW_META);
  const scopedEntries = isEmployee ? entries : entries.filter(([id]) => ['dashboard', 'reports', 'settings'].includes(id));
  return scopedEntries.map(([id, meta]) => ({ id, ...meta }));
}
