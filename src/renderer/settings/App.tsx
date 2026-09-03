import { useState, useEffect } from 'react';
import type { AppSettings } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import AIConfigTab from '../settings-components/AIConfigTab';
import FunctionsTab from '../settings-components/FunctionsTab';
import AppearanceTab from '../settings-components/AppearanceTab';
import GeneralTab from '../settings-components/GeneralTab';
import HistoryTab from '../settings-components/HistoryTab';
import '../styles/settings.css';

type Tab = 'ai' | 'functions' | 'appearance' | 'general' | 'history';

const api = window.electronAPI;

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'ai', label: 'AI', icon: '\u{1F916}' },
  { key: 'functions', label: 'Functions', icon: '\u{26A1}' },
  { key: 'appearance', label: 'Appearance', icon: '\u{1F3A8}' },
  { key: 'general', label: 'General', icon: '\u{2699}\u{FE0F}' },
  { key: 'history', label: 'History', icon: '\u{1F4CB}' },
];

export default function SettingsApp() {
  const [activeTab, setActiveTab] = useState<Tab>('ai');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [dirty, setDirty] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!api) { setReady(true); return; }
    api.config.getAll().then((s) => { setSettings(s); setReady(true); }).catch(() => setReady(true));
    const unsub = api.settings.onUpdated((data) => setSettings((prev) => ({ ...prev, ...data })));
    const unsubHistory = api.settings.onShowHistory(() => setActiveTab('history'));
    return () => { unsub(); unsubHistory(); };
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

  if (!ready) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading...</div>;
  }

  const activeLabel = tabs.find((t) => t.key === activeTab)?.label ?? '';
  const isHistory = activeTab === 'history';

  return (
    <div className="settings-root">
      {/* Sidebar */}
      <div className="settings-sidebar">
        <div className="settings-sidebar-title">Settings</div>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`settings-nav-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="settings-nav-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="settings-content">
        <div className="settings-header">
          <h2>{activeLabel}</h2>
        </div>

        <div className="settings-body" style={isHistory ? { padding: 0, overflow: 'hidden' } : undefined}>
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
            />
          )}
          {activeTab === 'general' && (
            <GeneralTab
              autoHideSeconds={settings.popup.autoDismissSeconds}
              onChangeAutoHide={(s) => { setSettings((p) => ({ ...p, popup: { ...p.popup, autoDismissSeconds: s } })); setDirty(true); }}
              autoStart={settings.autoStart}
              onChangeAutoStart={(v) => { setSettings((p) => ({ ...p, autoStart: v })); setDirty(true); }}
              onReset={handleReset}
            />
          )}
          {activeTab === 'history' && (
            <HistoryTab functions={settings.functions} />
          )}
        </div>

        {/* Footer — hide for history tab */}
        {!isHistory && (
          <div className="settings-footer">
            <button onClick={() => api?.settings.close()}>Cancel</button>
            <button className="primary" disabled={!dirty} onClick={() => handleSave(settings)}>Save</button>
          </div>
        )}
      </div>
    </div>
  );
}
