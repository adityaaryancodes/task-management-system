import { DESKTOP_SETTINGS } from '../config/workspace';
import { SectionPanel } from '../components/common/SectionPanel';

export function SettingsPage({ status, settingsMessage, setSettingsMessage, onToggleTracking, onToggleBreak, canToggleBreak, onLogout, proofName, proofStatus, onProofSelection }) {
  return (
    <div className="page-stack">
      <div className="dashboard-grid">
        <SectionPanel eyebrow="Control Center" title="Tracking controls" subtitle="The actions employees use most often." accent="blue">
          <div className="control-column">
            <button className="primary-button" onClick={onToggleTracking}>
              {status.tracking ? 'Pause Tracking' : 'Start Tracking'}
            </button>
            <button className="ghost-button" onClick={onToggleBreak} disabled={!canToggleBreak}>
              {status.breakActive ? 'Resume Work' : 'Take Break'}
            </button>
            <button
              className="ghost-button"
              onClick={() => setSettingsMessage('Next step: wire these cards to editable desktop and organization policies.')}
            >
              Open Advanced Settings
            </button>
            <button className="ghost-button" onClick={onLogout}>
              Logout
            </button>
            {settingsMessage ? <p className="support-text">{settingsMessage}</p> : null}
          </div>
        </SectionPanel>

        <SectionPanel eyebrow="Desktop Rules" title="Current configuration" subtitle="Defaults already active inside the Electron agent." accent="mint">
          <div className="settings-list">
            {DESKTOP_SETTINGS.map((item) => (
              <div className="settings-item" key={item.label}>
                <div>
                  <p className="settings-label">{item.label}</p>
                  <p className="settings-copy">{item.hint}</p>
                </div>
                <span className="settings-value">{item.value}</span>
              </div>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel eyebrow="Work Proof" title="Attachment staging" subtitle="Keep supporting files close to the workday flow." accent="peach">
          <label className="proof-dropzone spacious">
            <span className="proof-label">Upload work proof</span>
            <span className="proof-copy">{proofName || 'Choose a file to stage evidence for a future proof and reporting workflow.'}</span>
            {proofStatus ? <span className="support-text">{proofStatus}</span> : null}
            <input type="file" className="hidden-input" onChange={onProofSelection} />
          </label>
        </SectionPanel>
      </div>
    </div>
  );
}
