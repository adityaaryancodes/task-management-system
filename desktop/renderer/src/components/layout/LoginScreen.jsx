export function LoginScreen({ email, setEmail, password, setPassword, loginError, loading, onSubmit }) {
  return (
    <div className="app-shell login-mode">
      <div className="login-layout">
        <section className="login-showcase">
          <div className="login-showcase-copy">
            <p className="eyebrow">Hybrid Workforce Agent</p>
            <h1 className="login-title">A sharper desktop workspace for employee focus.</h1>
            <p className="login-description">
              Track time, surface app activity, manage assigned work, and keep sync healthy from one polished Electron experience.
            </p>
          </div>

          <div className="login-feature-grid">
            <div className="feature-card">
              <p className="feature-label">Work Timer</p>
              <p className="feature-value">Live</p>
              <p className="feature-copy">See active sessions, idle drift, and the current workday status at a glance.</p>
            </div>
            <div className="feature-card">
              <p className="feature-label">Tasks</p>
              <p className="feature-value">Fast</p>
              <p className="feature-copy">Move work from to-do to completed without jumping into the browser dashboard.</p>
            </div>
            <div className="feature-card">
              <p className="feature-label">Activity</p>
              <p className="feature-value">Visible</p>
              <p className="feature-copy">Recent apps, browser title signals, and screenshot health stay easy to review.</p>
            </div>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-panel-head">
            <p className="login-kicker">Sign in</p>
            <h2 className="login-panel-title">Continue to your workspace</h2>
            <p className="login-panel-copy">Use your work credentials to access the desktop control center.</p>
          </div>

          <form className="login-form" onSubmit={onSubmit}>
            <label className="field-label">
              Work email
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
            </label>
            <label className="field-label">
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required />
            </label>
            {loginError ? <p className="inline-error">{loginError}</p> : null}
            <button className="primary-button login-button" disabled={loading}>
              {loading ? 'Signing in...' : 'Open Workspace'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
