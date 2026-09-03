import { useState } from 'react';
import type { AISettings, Provider } from '../../shared/types';

interface AIConfigTabProps {
  settings: AISettings;
  onChange: (settings: AISettings) => void;
}

interface BalanceInfo {
  currency: string;
  total_balance: string;
  granted_balance: string;
  topped_up_balance: string;
}

export default function AIConfigTab({ settings, onChange }: AIConfigTabProps) {
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [balanceData, setBalanceData] = useState<BalanceInfo[] | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

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

  const handleCheckBalance = async () => {
    setCheckingBalance(true);
    setBalanceData(null);
    setBalanceError(null);
    try {
      if (settings.provider === 'anthropic') {
        setBalanceError('Anthropic does not expose a balance API. Check console.anthropic.com.');
        return;
      }
      const res = await fetch(`${settings.baseUrl}/user/balance`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + settings.apiKey },
      });
      if (!res.ok) {
        setBalanceError(`Not supported (${res.status}). Check your provider's dashboard.`);
        return;
      }
      const data = await res.json();
      if (data.balance_infos?.length) {
        setBalanceData(data.balance_infos);
      } else {
        setBalanceError('Unexpected response format.');
      }
    } catch (err) {
      setBalanceError('Failed: ' + (err as Error).message);
    } finally {
      setCheckingBalance(false);
    }
  };

  const providers: { value: Provider; label: string }[] = [
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'openai', label: 'OpenAI Compatible' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Provider + Connection */}
      <div className="settings-section">
        <div className="settings-section-title">Provider</div>
        <div className="settings-field">
          <div className="settings-segmented">
            {providers.map((p) => (
              <button
                key={p.value}
                className={settings.provider === p.value ? 'active' : ''}
                onClick={() => handleChange('provider', p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-field">
          <label className="settings-field-label">Base URL</label>
          <input
            type="text"
            value={settings.baseUrl}
            onChange={(e) => handleChange('baseUrl', e.target.value)}
            placeholder="https://api.anthropic.com"
          />
        </div>

        <div className="settings-field">
          <label className="settings-field-label">API Key</label>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) => handleChange('apiKey', e.target.value)}
            placeholder="Enter API key"
          />
        </div>

        <div className="settings-field">
          <label className="settings-field-label">Model</label>
          <input
            type="text"
            value={settings.model}
            onChange={(e) => handleChange('model', e.target.value)}
            placeholder="claude-sonnet-4-20250514"
          />
        </div>
      </div>

      {/* Parameters */}
      <div className="settings-section">
        <div className="settings-section-title">Parameters</div>

        <div className="settings-field">
          <label className="settings-field-label">Max Output Tokens</label>
          <div className="settings-slider-row">
            <input
              type="range"
              min={256}
              max={16384}
              step={256}
              value={settings.maxTokens}
              onChange={(e) => onChange({ ...settings, maxTokens: Number(e.target.value) })}
            />
            <span className="settings-slider-value">{settings.maxTokens}</span>
          </div>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">Thinking Mode</div>
            <div className="settings-row-hint">DeepSeek reasoning chain (slower, higher cost)</div>
          </div>
          <button
            className={`settings-toggle ${settings.thinking ? 'on' : ''}`}
            onClick={() => onChange({ ...settings, thinking: !settings.thinking })}
          >
            <div className="settings-toggle-knob" />
          </button>
        </div>
      </div>

      {/* Test & Balance */}
      <div className="settings-section">
        <div className="settings-section-title">Connection</div>
        <div className="settings-actions">
          <button onClick={handleTest} disabled={testing || !settings.apiKey}>
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button onClick={handleCheckBalance} disabled={checkingBalance || !settings.apiKey}>
            {checkingBalance ? 'Checking...' : 'Check Balance'}
          </button>
          {settings.baseUrl.toLowerCase().includes('deepseek') && (
            <button onClick={() => window.electronAPI?.popup.openUrl('https://platform.deepseek.com/usage')}>
              Check Online
            </button>
          )}
        </div>
        {testResult && (
          <div className={`settings-actions result ${testResult.startsWith('OK') ? 'ok' : 'error'}`}
            style={{ marginTop: 8, fontSize: 12 }}>
            {testResult}
          </div>
        )}
        {balanceError && (
          <div style={{ fontSize: 12, color: 'var(--text-error)', marginTop: 8 }}>{balanceError}</div>
        )}
        {balanceData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
            {balanceData.map((info, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6, padding: '8px 12px', fontSize: 12,
              }}>
                <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.45)', fontSize: 10, textTransform: 'uppercase', marginBottom: 6 }}>
                  {info.currency}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Total</span>
                  <span style={{ fontWeight: 500 }}>{Number(info.total_balance).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 1 }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Granted</span>
                  <span>{Number(info.granted_balance).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Topped Up</span>
                  <span>{Number(info.topped_up_balance).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
