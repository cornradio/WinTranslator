import type { AppearanceSettings, Theme } from '../../shared/types';

interface AppearanceTabProps {
  settings: AppearanceSettings;
  onChange: (settings: AppearanceSettings) => void;
  autoHideSeconds: number;
  onChangeAutoHide: (seconds: number) => void;
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

export default function AppearanceTab({ settings, onChange, autoHideSeconds, onChangeAutoHide }: AppearanceTabProps) {
  const handleChange = (key: keyof AppearanceSettings, value: unknown) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Theme */}
      <Section title="Theme">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {themes.map((t) => (
            <div
              key={t.value}
              onClick={() => handleChange('theme', t.value)}
              style={{
                padding: '12px',
                background: t.preview,
                border: settings.theme === t.value ? '2px solid #0a84ff' : '2px solid rgba(128,128,128,0.2)',
                borderRadius: '10px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: t.text, marginBottom: '4px' }}>
                {t.label}
              </div>
              <div style={{ fontSize: '11px', color: t.text, opacity: 0.6 }}>
                {t.desc}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Opacity */}
      <Section title={`Opacity: ${Math.round(settings.opacity * 100)}%`}>
        <input
          type="range"
          min={10}
          max={100}
          value={Math.round(settings.opacity * 100)}
          onChange={(e) => handleChange('opacity', Number(e.target.value) / 100)}
          style={{ width: '100%', accentColor: '#0a84ff' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
          <span>10%</span>
          <span>100%</span>
        </div>
      </Section>

      {/* Auto-hide */}
      <Section title="Auto-hide">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div
            onClick={() => onChangeAutoHide(autoHideSeconds > 0 ? 0 : 8)}
            style={{
              width: '40px',
              height: '22px',
              borderRadius: '11px',
              background: autoHideSeconds > 0 ? '#0a84ff' : 'rgba(255,255,255,0.15)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#fff',
              position: 'absolute',
              top: '2px',
              left: autoHideSeconds > 0 ? '20px' : '2px',
              transition: 'left 0.2s',
            }} />
          </div>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
            {autoHideSeconds > 0 ? `Auto-hide after ${autoHideSeconds}s` : 'Never auto-hide'}
          </span>
        </div>
        {autoHideSeconds > 0 && (
          <>
            <input
              type="range"
              min={1}
              max={60}
              value={autoHideSeconds}
              onChange={(e) => onChangeAutoHide(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#0a84ff' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
              <span>1s</span>
              <span>60s</span>
            </div>
          </>
        )}
      </Section>

      {/* Border Radius */}
      <Section title={`Border Radius: ${settings.borderRadius}px`}>
        <input
          type="range"
          min={0}
          max={24}
          value={settings.borderRadius}
          onChange={(e) => handleChange('borderRadius', Number(e.target.value))}
          style={{ width: '100%', accentColor: '#0a84ff' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
          <span>0px</span>
          <span>24px</span>
        </div>
      </Section>

      {/* Border Width */}
      <Section title={`Border Width: ${settings.borderWidth}px`}>
        <input
          type="range"
          min={0}
          max={3}
          step={0.5}
          value={settings.borderWidth}
          onChange={(e) => handleChange('borderWidth', Number(e.target.value))}
          style={{ width: '100%', accentColor: '#0a84ff' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
          <span>0px</span>
          <span>3px</span>
        </div>
      </Section>

      {/* Live Preview */}
      <Section title="Preview">
        <div style={{
          padding: '16px',
          background: getThemeBg(settings.theme, settings.opacity),
          border: `${settings.borderWidth}px solid ${isThemeDark(settings.theme) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
          borderRadius: `${settings.borderRadius}px`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          color: isThemeDark(settings.theme) ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.85)',
          fontSize: '12px',
          lineHeight: '1.6',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Translation Preview</div>
          <div style={{ opacity: 0.7 }}>This is how the popup will look with your current appearance settings.</div>
        </div>
      </Section>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: '11px',
        fontWeight: 600,
        color: 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        marginBottom: '10px',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}
