import { useState } from 'react';
import type { AISettings, Provider } from '../../shared/types';

interface AIConfigTabProps {
  settings: AISettings;
  onChange: (settings: AISettings) => void;
}

export default function AIConfigTab({ settings, onChange }: AIConfigTabProps) {
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const handleChange = (key: keyof AISettings, value: string) => {
    onChange({ ...settings, [key]: value });
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const url = settings.provider === 'anthropic'
        ? settings.baseUrl + '/v1/messages'
        : settings.baseUrl + '/v1/chat/completions';

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (settings.provider === 'anthropic') {
        headers['x-api-key'] = settings.apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else {
        headers['Authorization'] = 'Bearer ' + settings.apiKey;
      }

      const body = JSON.stringify({
        model: settings.model,
        max_tokens: 32,
        messages: [{ role: 'user', content: 'Say OK' }],
      });

      const res = await fetch(url, { method: 'POST', headers, body });
      if (res.ok) {
        const data = await res.json();
        const text = settings.provider === 'anthropic'
          ? data.content?.[0]?.text
          : data.choices?.[0]?.message?.content;
        setTestResult('OK: ' + (text || 'Connected'));
      } else {
        setTestResult('Failed: ' + res.status + ' ' + res.statusText);
      }
    } catch (err) {
      setTestResult('Failed: ' + (err as Error).message);
    } finally {
      setTesting(false);
    }
  };

  const providers: { value: Provider; label: string }[] = [
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'openai', label: 'OpenAI Compatible' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Field label="API Format">
        <div style={{ display: 'flex', gap: '0' }}>
          {providers.map((p) => (
            <button
              key={p.value}
              onClick={() => handleChange('provider', p.value)}
              style={{
                flex: 1,
                padding: '8px',
                background: settings.provider === p.value ? 'var(--accent-blue)' : 'rgba(255,255,255,0.06)',
                border: '1px solid ' + (settings.provider === p.value ? 'var(--accent-blue)' : 'rgba(255,255,255,0.12)'),
                color: settings.provider === p.value ? 'white' : 'var(--text-secondary)',
                borderRadius: p.value === 'anthropic' ? 'var(--radius-sm) 0 0 var(--radius-sm)' : '0 var(--radius-sm) var(--radius-sm) 0',
                cursor: 'pointer',
                fontWeight: settings.provider === p.value ? 600 : 400,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Base URL">
        <input
          type="text"
          value={settings.baseUrl}
          onChange={(e) => handleChange('baseUrl', e.target.value)}
          placeholder="https://api.anthropic.com"
          style={{ width: '100%' }}
        />
      </Field>

      <Field label="API Key">
        <input
          type="password"
          value={settings.apiKey}
          onChange={(e) => handleChange('apiKey', e.target.value)}
          placeholder="Enter API key"
          style={{ width: '100%' }}
        />
      </Field>

      <Field label="Model">
        <input
          type="text"
          value={settings.model}
          onChange={(e) => handleChange('model', e.target.value)}
          placeholder="claude-sonnet-4-20250514"
          style={{ width: '100%' }}
        />
      </Field>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={handleTest} disabled={testing || !settings.apiKey}>
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
        {testResult && (
          <span style={{
            fontSize: '12px',
            color: testResult.startsWith('OK') ? 'var(--accent-green)' : 'var(--text-error)',
          }}>
            {testResult}
          </span>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        marginBottom: '6px',
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}
