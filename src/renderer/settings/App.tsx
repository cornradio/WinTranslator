import { useState, useEffect } from 'react';
import type { AppSettings } from '../../shared/types';
import { DEFAULT_SETTINGS, APP_VERSION, GITHUB_RELEASES_URL, GITHUB_API_LATEST_RELEASE } from '../../shared/constants';
import AIConfigTab from '../settings-components/AIConfigTab';
import FunctionsTab from '../settings-components/FunctionsTab';
import AppearanceTab from '../settings-components/AppearanceTab';

type Tab = 'ai' | 'functions' | 'appearance';

const api = window.electronAPI;

export default function SettingsApp() {
  const [activeTab, setActiveTab] = useState<Tab>('ai');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [dirty, setDirty] = useState(false);
  const [ready, setReady] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!api) { setReady(true); return; }
    api.config.getAll().then((s) => { setSettings(s); setReady(true); }).catch(() => setReady(true));
    const unsub = api.settings.onUpdated((data) => setSettings((prev) => ({ ...prev, ...data })));
    return () => unsub();
  }, []);

  const handleSave = async (updated: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updated };
    setSettings(newSettings);
    if (api) {
      for (const [key, value] of Object.entries(updated)) {
        await api.config.set(key, value);
      }
    }
    setDirty(false);
  };

  const handleReset = async () => {
    setSettings(DEFAULT_SETTINGS);
    if (api) {
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        await api.config.set(key, value);
      }
    }
    setDirty(false);
  };

  const handleExport = async () => {
    if (!api) return;
    const json = await api.config.exportFunctions();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wintranslator-functions.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !api) return;
      const text = await file.text();
      try {
        await api.config.importFunctions(text);
        alert('Functions imported successfully!');
      } catch (err) {
        alert('Import failed: ' + (err as Error).message);
      }
    };
    input.click();
  };

  const checkForUpdates = async () => {
    setChecking(true);
    setUpdateStatus(null);
    try {
      const res = await fetch(GITHUB_API_LATEST_RELEASE);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const latest = (data.tag_name || '').replace(/^v/, '');
      const current = APP_VERSION;
      if (!latest) {
        setUpdateStatus('Unable to parse latest version');
      } else if (latest > current) {
        setUpdateStatus(`New version available: v${latest}`);
      } else {
        setUpdateStatus(`You are up to date (v${current})`);
      }
    } catch (err) {
      setUpdateStatus('Check failed: ' + (err as Error).message);
    } finally {
      setChecking(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'ai', label: 'AI', icon: '\u{1F916}' },
    { key: 'functions', label: 'Functions', icon: '\u{26A1}' },
    { key: 'appearance', label: 'Appearance', icon: '\u{1F3A8}' },
  ];

  if (!ready) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading...</div>;
  }

  return (
    <div style={{ width: '100%', height: '100vh', background: '#1c1c1e', color: 'rgba(255,255,255,0.92)', display: 'flex', flexDirection: 'column' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 12px', background: 'rgba(255,255,255,0.03)' }}>
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            background: 'none', border: 'none',
            borderBottom: activeTab === tab.key ? '2px solid #0a84ff' : '2px solid transparent',
            color: activeTab === tab.key ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.55)',
            padding: '10px 12px', cursor: 'pointer', fontSize: 12,
            fontWeight: activeTab === tab.key ? 600 : 400,
            display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
          }}>
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {activeTab === 'ai' && (
          <AIConfigTab settings={settings.ai} onChange={(ai) => { setSettings((p) => ({ ...p, ai })); setDirty(true); }} />
        )}
        {activeTab === 'functions' && (
          <FunctionsTab
            functions={settings.functions}
            onChange={(f) => { setSettings((p) => ({ ...p, functions: f })); setDirty(true); }}
            onExport={handleExport}
            onImport={handleImport}
          />
        )}
        {activeTab === 'appearance' && (
          <AppearanceTab
            settings={settings.appearance}
            onChange={(a) => { setSettings((p) => ({ ...p, appearance: a })); setDirty(true); }}
            autoHideSeconds={settings.popup.autoDismissSeconds}
            onChangeAutoHide={(s) => { setSettings((p) => ({ ...p, popup: { ...p.popup, autoDismissSeconds: s } })); setDirty(true); }}
          />
        )}
      </div>

      {/* Version & Update */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>WinTranslator v{APP_VERSION}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {updateStatus && (
            <span style={{
              fontSize: 11,
              color: updateStatus.includes('New version')
                ? '#ffa500'
                : updateStatus.includes('up to date')
                ? '#30d158'
                : updateStatus.includes('failed')
                ? '#ff453a'
                : 'rgba(255,255,255,0.5)',
            }}>
              {updateStatus.includes('New version') ? (
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => window.electronAPI?.popup.openUrl(GITHUB_RELEASES_URL)}>
                  {updateStatus}
                </span>
              ) : updateStatus}
            </span>
          )}
          <button onClick={checkForUpdates} disabled={checking}
            style={{ fontSize: 11, padding: '3px 10px' }}>
            {checking ? 'Checking...' : 'Check for Updates'}
          </button>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
        <button className="danger" onClick={handleReset}>Reset Defaults</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => api?.settings.close()}>Cancel</button>
          <button className="primary" disabled={!dirty} onClick={() => handleSave(settings)}>Save</button>
        </div>
      </div>
    </div>
  );
}
