import { useState } from 'react';
import { APP_VERSION, GITHUB_RELEASES_URL, GITHUB_API_LATEST_RELEASE } from '../../shared/constants';

interface GeneralTabProps {
  autoHideSeconds: number;
  onChangeAutoHide: (seconds: number) => void;
  autoStart: boolean;
  onChangeAutoStart: (enabled: boolean) => void;
  onReset: () => void;
}

export default function GeneralTab({ autoHideSeconds, onChangeAutoHide, autoStart, onChangeAutoStart, onReset }: GeneralTabProps) {
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const checkForUpdates = async () => {
    setChecking(true);
    setUpdateStatus(null);
    try {
      const res = await fetch(GITHUB_API_LATEST_RELEASE);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const latest = (data.tag_name || '').replace(/^v/, '');
      if (!latest) {
        setUpdateStatus('Unable to parse latest version');
      } else if (latest > APP_VERSION) {
        setUpdateStatus(`New version available: v${latest}`);
      } else {
        setUpdateStatus(`You are up to date (v${APP_VERSION})`);
      }
    } catch (err) {
      setUpdateStatus('Check failed: ' + (err as Error).message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Popup behavior */}
      <div className="settings-section">
        <div className="settings-section-title">Popup Behavior</div>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">Auto-hide</div>
            <div className="settings-row-hint">
              {autoHideSeconds > 0 ? `Dismiss after ${autoHideSeconds}s` : 'Never auto-hide'}
            </div>
          </div>
          <button
            className={`settings-toggle ${autoHideSeconds > 0 ? 'on' : ''}`}
            onClick={() => onChangeAutoHide(autoHideSeconds > 0 ? 0 : 8)}
          >
            <div className="settings-toggle-knob" />
          </button>
        </div>

        {autoHideSeconds > 0 && (
          <div style={{ marginTop: 8 }}>
            <div className="settings-slider-row">
              <input type="range" min={1} max={60} value={autoHideSeconds}
                onChange={(e) => onChangeAutoHide(Number(e.target.value))} />
              <span className="settings-slider-value">{autoHideSeconds}s</span>
            </div>
          </div>
        )}
      </div>

      {/* Startup */}
      <div className="settings-section">
        <div className="settings-section-title">Startup</div>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">Launch at Login</div>
            <div className="settings-row-hint">
              {autoStart ? 'Starts automatically at login' : 'Manual launch required'}
            </div>
          </div>
          <button
            className={`settings-toggle ${autoStart ? 'on' : ''}`}
            onClick={() => onChangeAutoStart(!autoStart)}
          >
            <div className="settings-toggle-knob" />
          </button>
        </div>

        <div style={{ marginTop: 8 }}>
          <button onClick={() => window.electronAPI?.app.restart()} style={{ fontSize: 11 }}>
            Test Restart
          </button>
          <div className="settings-row-hint" style={{ marginTop: 4 }}>
            Quits and relaunches the app to verify startup behavior
          </div>
        </div>
      </div>

      {/* About */}
      <div className="settings-section">
        <div className="settings-section-title">About</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
          WinTranslator v{APP_VERSION}
        </div>
        <div className="settings-actions">
          <button onClick={checkForUpdates} disabled={checking}>
            {checking ? 'Checking...' : 'Check for Updates'}
          </button>
          <button onClick={() => window.electronAPI?.popup.openUrl('https://github.com/cornradio/WinTranslator')}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            GitHub
          </button>
        </div>
        {updateStatus && (
          <div style={{ fontSize: 11, marginTop: 8 }} className={`settings-actions result ${
            updateStatus.includes('New version') ? 'warn' : updateStatus.includes('up to date') ? 'ok' : 'error'
          }`}>
            {updateStatus.includes('New version') ? (
              <span style={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => window.electronAPI?.popup.openUrl(GITHUB_RELEASES_URL)}>
                {updateStatus}
              </span>
            ) : updateStatus}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="settings-section" style={{ borderColor: 'rgba(255,69,58,0.15)' }}>
        <div className="settings-section-title" style={{ color: '#ff453a' }}>Danger Zone</div>
        <div className="settings-actions">
          <button onClick={() => window.electronAPI?.popup.openUrl('https://github.com/cornradio/WinTranslator')}>
            Open Setup Guide
          </button>
          <button className="danger" onClick={onReset}>Reset Defaults</button>
        </div>
      </div>
    </div>
  );
}
