export function WorkspaceShell({
  status,
  workTimer,
  syncStateLabel,
  actionStatusLabel,
  visibleNavItems,
  activeView,
  setActiveView,
  currentView,
  productivityScore,
  todayLabel,
  onToggleTracking,
  onLogout,
  children
}) {
  return (
    <div className="app-shell">
      <div className="workspace-shell">
        <aside className="workspace-sidebar">
          <div className="sidebar-brand">
            <p className="sidebar-kicker">Workforce Intelligence</p>
            <h1 className="sidebar-title">Desktop Control</h1>
            <p className="sidebar-copy">A focused operator view for tracking, tasks, screenshots, and daily reporting.</p>
          </div>

          <div className="identity-card">
            <div className="avatar-badge">{String(status.user?.full_name || status.user?.email || 'WF').slice(0, 2).toUpperCase()}</div>
            <div>
              <p className="identity-name">{status.user?.full_name || status.user?.email}</p>
              <p className="identity-role">{status.user?.role || 'Employee'}</p>
            </div>
          </div>

          <div className="sidebar-status-card">
            <p className="sidebar-status-label">Session State</p>
            <span className={`badge ${status.tracking ? 'status-positive' : status.breakActive ? 'status-warning' : 'status-neutral'}`}>
              {actionStatusLabel}
            </span>
            <p className="sidebar-status-copy">Work timer {workTimer}</p>
            <p className="sidebar-status-copy">Sync {syncStateLabel}</p>
          </div>

          <nav className="sidebar-nav">
            {visibleNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                onClick={() => setActiveView(item.id)}
              >
                <span className="nav-label">{item.label}</span>
                <span className="nav-hint">{item.hint}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-actions">
            <button className="primary-button compact" onClick={onToggleTracking}>
              {status.tracking ? 'Pause Tracking' : 'Start Tracking'}
            </button>
            <button className="ghost-button compact" onClick={onLogout}>
              Logout
            </button>
          </div>
        </aside>

        <main className="workspace-main">
          <header className="workspace-topbar">
            <div>
              <p className="topbar-eyebrow">{currentView.eyebrow}</p>
              <h2 className="topbar-title">{currentView.title}</h2>
              <p className="topbar-copy">{currentView.description}</p>
            </div>
            <div className="topbar-pills">
              <span className="topbar-pill">{todayLabel}</span>
              <span className={`topbar-pill ${status.syncStatus === 'connected' ? 'status-positive' : status.syncStatus === 'syncing' || status.syncStatus === 'paused' ? 'status-warning' : 'status-neutral'}`}>
                {syncStateLabel}
              </span>
              <span className="topbar-pill">Productivity {productivityScore}%</span>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
