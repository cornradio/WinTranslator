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

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 10, display: 'block',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Auto-hide */}
      <div>
        <div style={labelStyle}>Auto-hide</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div
            onClick={() => onChangeAutoHide(autoHideSeconds > 0 ? 0 : 8)}
            style={{
              width: 40, height: 22, borderRadius: 11, cursor: 'pointer', position: 'relative',
              background: autoHideSeconds > 0 ? '#0a84ff' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2,
              left: autoHideSeconds > 0 ? 20 : 2, transition: 'left 0.2s',
            }} />
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
            {autoHideSeconds > 0 ? `Auto-hide after ${autoHideSeconds}s` : 'Never auto-hide'}
          </span>
        </div>
        {autoHideSeconds > 0 && (
          <>
            <input type="range" min={1} max={60} value={autoHideSeconds}
              onChange={(e) => onChangeAutoHide(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#0a84ff' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              <span>1s</span><span>60s</span>
            </div>
          </>
        )}
      </div>

      {/* Launch at Login */}
      <div>
        <div style={labelStyle}>Launch at Login</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            onClick={() => onChangeAutoStart(!autoStart)}
            style={{
              width: 40, height: 22, borderRadius: 11, cursor: 'pointer', position: 'relative',
              background: autoStart ? '#0a84ff' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2,
              left: autoStart ? 20 : 2, transition: 'left 0.2s',
            }} />
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
            {autoStart ? 'App will start automatically at login' : 'Manual launch required'}
          </span>
        </div>
      </div>

      {/* About */}
      <div>
        <div style={labelStyle}>About</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
          WinTranslator v{APP_VERSION}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={checkForUpdates} disabled={checking}
            style={{ fontSize: 11, padding: '4px 12px' }}>
            {checking ? 'Checking...' : 'Check for Updates'}
          </button>
          <button onClick={() => window.electronAPI?.popup.openUrl('https://github.com/cornradio/WinTranslator')}
            style={{ fontSize: 11, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            GitHub
          </button>
        </div>
        {updateStatus && (
          <div style={{
            fontSize: 11, marginTop: 8,
            color: updateStatus.includes('New version') ? '#ffa500'
              : updateStatus.includes('up to date') ? '#30d158'
              : updateStatus.includes('failed') ? '#ff453a'
              : 'rgba(255,255,255,0.5)',
          }}>
            {updateStatus.includes('New version') ? (
              <span style={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => window.electronAPI?.popup.openUrl(GITHUB_RELEASES_URL)}>
                {updateStatus}
              </span>
            ) : updateStatus}
          </div>
        )}
      </div>

      {/* Reset */}
      <div>
        <div style={labelStyle}>Danger Zone</div>
        <button className="danger" onClick={onReset}>Reset Defaults</button>
      </div>
    </div>
  );
}
