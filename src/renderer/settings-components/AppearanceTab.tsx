import type { AppearanceSettings, Theme } from '../../shared/types';

interface AppearanceTabProps {
  settings: AppearanceSettings;
  onChange: (settings: AppearanceSettings) => void;
}

const themes: { value: Theme; label: string; preview: string; text: string; desc: string }[] = [
  { value: 'dark', label: 'Dark', preview: '#1c1c1e', text: '#f5f5f7', desc: 'Classic dark' },
  { value: 'monokai', label: 'Monokai', preview: '#272822', text: '#f8f8f2', desc: 'Warm dark tones' },
  { value: 'paper', label: 'Paper', preview: '#f8f4ec', text: '#3c3836', desc: 'Warm light' },
  { value: 'light', label: 'Light', preview: '#f5f5f7', text: '#1d1d1f', desc: 'Classic light' },
];

export function isThemeDark(theme: Theme): boolean {
  return theme === 'dark' || theme === 'monokai';
}

export default function AppearanceTab({ settings, onChange }: AppearanceTabProps) {
  const handleChange = (key: keyof AppearanceSettings, value: unknown) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Theme */}
      <div className="settings-section">
        <div className="settings-section-title">Theme</div>
        <div className="theme-grid">
          {themes.map((t) => (
            <div
              key={t.value}
              className={`theme-card ${settings.theme === t.value ? 'active' : ''}`}
              onClick={() => handleChange('theme', t.value)}
              style={{ background: t.preview }}
            >
              <div className="theme-card-label" style={{ color: t.text }}>{t.label}</div>
              <div className="theme-card-desc" style={{ color: t.text }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Opacity & Blur */}
      <div className="settings-section">
        <div className="settings-section-title">Transparency</div>

        <div className="settings-field">
          <label className="settings-field-label">Opacity: {Math.round(settings.opacity * 100)}%</label>
          <div className="settings-slider-row">
            <input
              type="range"
              min={10}
              max={100}
              value={Math.round(settings.opacity * 100)}
              onChange={(e) => handleChange('opacity', Number(e.target.value) / 100)}
            />
            <span className="settings-slider-value">{Math.round(settings.opacity * 100)}%</span>
          </div>
        </div>

        <div className="settings-row" style={{ marginTop: 4 }}>
          <div>
            <div className="settings-row-label">Blur Effect</div>
            <div className="settings-row-hint">
              {settings.blurEnabled ? 'Native blur enabled (macOS)' : 'Disabled — using opacity only'}
            </div>
          </div>
          <button
            className={`settings-toggle ${settings.blurEnabled ? 'on' : ''}`}
            onClick={() => handleChange('blurEnabled', !settings.blurEnabled)}
          >
            <div className="settings-toggle-knob" />
          </button>
        </div>
      </div>

      {/* Border */}
      <div className="settings-section">
        <div className="settings-section-title">Border</div>

        <div className="settings-field">
          <label className="settings-field-label">Radius: {settings.borderRadius}px</label>
          <div className="settings-slider-row">
            <input
              type="range"
              min={0}
              max={24}
              value={settings.borderRadius}
              onChange={(e) => handleChange('borderRadius', Number(e.target.value))}
            />
            <span className="settings-slider-value">{settings.borderRadius}px</span>
          </div>
        </div>

        <div className="settings-field">
          <label className="settings-field-label">Width: {settings.borderWidth}px</label>
          <div className="settings-slider-row">
            <input
              type="range"
              min={0}
              max={3}
              step={0.5}
              value={settings.borderWidth}
              onChange={(e) => handleChange('borderWidth', Number(e.target.value))}
            />
            <span className="settings-slider-value">{settings.borderWidth}px</span>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="settings-section">
        <div className="settings-section-title">Preview</div>
        <div style={{
          padding: 14,
          background: getThemeBg(settings.theme, settings.opacity),
          border: `${settings.borderWidth}px solid ${isThemeDark(settings.theme) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
          borderRadius: `${settings.borderRadius}px`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          color: isThemeDark(settings.theme) ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.85)',
          fontSize: 12,
          lineHeight: 1.6,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Translation Preview</div>
          <div style={{ opacity: 0.7 }}>This is how the popup will look with your current settings.</div>
        </div>
      </div>
    </div>
  );
}

export function getThemeBg(theme: Theme, opacity: number): string {
  switch (theme) {
    case 'dark': return `rgba(28, 28, 30, ${opacity})`;
    case 'monokai': return `rgba(39, 40, 34, ${opacity})`;
    case 'paper': return `rgba(248, 244, 236, ${opacity})`;
    case 'light': return `rgba(245, 245, 247, ${opacity})`;
  }
}
