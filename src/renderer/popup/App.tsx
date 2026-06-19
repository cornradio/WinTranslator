import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppSettings, FunctionResult, FunctionGroup } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { useAutoResize } from '../hooks/useAutoResize';
import { useAutoDismiss } from '../hooks/useAutoDismiss';
import { streamLLM } from '../lib/api-client';
import { getThemeBg, isThemeDark } from '../settings-components/AppearanceTab';
import StreamingText from '../components/StreamingText';
import CopyButton from '../components/CopyButton';
import ErrorBanner from '../components/ErrorBanner';
import HistoryList from '../components/HistoryList';

const api = window.electronAPI;

export default function PopupApp() {
  const [sourceText, setSourceText] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupIcon, setGroupIcon] = useState('');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showHistory, setShowHistory] = useState(false);
  const [isDragging] = useState(false);
  const [waitingForText, setWaitingForText] = useState(false);
  const [results, setResults] = useState<FunctionResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortControllersRef = useRef<AbortController[]>([]);

  const isStreaming = results.some((r) => r.isStreaming);

  // Load settings
  useEffect(() => {
    if (api) {
      api.config.getAll().then((s) => setSettings(s)).catch(() => {});
      const unsub = api.settings.onUpdated((data) => {
        setSettings((prev) => ({ ...prev, ...data }));
      });
      return () => unsub();
    }
  }, []);

  // ESC to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') api?.popup.hide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for incoming text from main process
  useEffect(() => {
    if (!api) return;
    const unsub = api.popup.onShowText((data) => {
      // Abort all in-progress streams
      abortControllersRef.current.forEach((c) => c.abort());
      abortControllersRef.current = [];
      setError(null);
      setShowHistory(false);

      if (!data.text) {
        // Waiting for text capture
        setWaitingForText(true);
        setSourceText('');
        setResults([]);
        return;
      }

      setWaitingForText(false);
      setSourceText(data.text);

      // Look up the function group
      const group = settings.functions.find((g) => g.id === data.groupId);
      if (!group) {
        setError(`Unknown function group: ${data.groupId}`);
        return;
      }

      setGroupName(group.name);
      setGroupIcon(group.icon);

      // Start parallel streaming for all prompts in this group
      startAllPrompts(data.text, group);
    });
    return () => unsub();
  }, [settings.functions]); // eslint-disable-line react-hooks/exhaustive-deps

  const startAllPrompts = useCallback(
    (text: string, group: FunctionGroup) => {
      const prompts = group.prompts;
      const initial: FunctionResult[] = prompts.map((p) => ({
        promptId: p.id,
        promptName: p.name,
        text: '',
        isStreaming: true,
        isError: false,
      }));
      setResults(initial);

      prompts.forEach((prompt, index) => {
        const userText = prompt.prompt.replace('{text}', text);
        let accumulated = '';

        const controller = streamLLM({
          provider: settings.ai.provider,
          apiKey: settings.ai.apiKey,
          model: settings.ai.model,
          baseUrl: settings.ai.baseUrl,
          systemPrompt: '',
          userText,
          maxTokens: prompt.maxTokens,
          onChunk: (chunk) => {
            accumulated += chunk;
            setResults((prev) => {
              const next = [...prev];
              next[index] = { ...next[index], text: accumulated, isStreaming: true };
              return next;
            });
          },
          onDone: () => {
            setResults((prev) => {
              const next = [...prev];
              next[index] = { ...next[index], isStreaming: false };
              return next;
            });
            api?.history.add({
              id: crypto.randomUUID(),
              timestamp: Date.now(),
              sourceText: text,
              resultText: accumulated,
              groupName: group.name,
              promptName: prompt.name,
            });
          },
          onError: () => {
            setResults((prev) => {
              const next = [...prev];
              next[index] = { ...next[index], isStreaming: false, isError: true };
              return next;
            });
          },
        });

        abortControllersRef.current.push(controller);
      });
    },
    [settings.ai]
  );

  useAutoResize([results, showHistory, error]);

  useAutoDismiss({
    seconds: settings.popup.autoDismissSeconds,
    enabled: !!sourceText && !isStreaming,
    onDismiss: () => api?.popup.hide(),
    isDragging,
  });

  const handleHide = () => {
    abortControllersRef.current.forEach((c) => c.abort());
    api?.popup.hide();
  };

  // Theme
  const ap = settings.appearance;
  const isDark = isThemeDark(ap.theme);
  const isMonokai = ap.theme === 'monokai';
  const panelStyle: React.CSSProperties = {
    position: 'relative',
    padding: '12px 16px',
    height: '100vh',
    overflowY: 'auto',
    background: getThemeBg(ap.theme, ap.opacity),
    border: `${ap.borderWidth}px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
    borderRadius: `${ap.borderRadius}px`,
    boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)',
    color: isDark ? (isMonokai ? '#f8f8f2' : 'rgba(255,255,255,0.92)') : 'rgba(0,0,0,0.85)',
    ['--text-primary' as string]: isDark ? (isMonokai ? '#f8f8f2' : 'rgba(255,255,255,0.92)') : 'rgba(0,0,0,0.85)',
    ['--text-secondary' as string]: isMonokai ? '#a6e22e' : isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
    ['--text-error' as string]: isMonokai ? '#f92672' : '#ff453a',
    ['--accent-blue' as string]: isMonokai ? '#66d9ef' : '#0a84ff',
    ['--accent-purple' as string]: isMonokai ? '#ae81ff' : '#bf5af2',
    ['--accent-green' as string]: isMonokai ? '#a6e22e' : '#30d158',
    ['--bg-glass' as string]: isDark ? 'rgba(28,28,30,0.82)' : 'rgba(245,245,247,0.82)',
  };

  return (
    <div id="content-root" className="fade-in" style={panelStyle}>
      {/* Header */}
      <div className="drag-handle" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '8px', padding: '2px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>{groupIcon || '\u{1F310}'}</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {groupName || 'Translate'}
          </span>
          {(isStreaming || waitingForText) && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-blue)', animation: 'pulse 1.2s infinite', display: 'inline-block' }} />}
        </div>
        <div className="no-drag" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {!showHistory && results.length === 1 && results[0].text && <CopyButton text={results[0].text} />}
          <button className="no-drag" onClick={() => setShowHistory(!showHistory)}
            style={{ background: 'none', border: 'none', padding: '2px 6px', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>History</button>
          <button className="no-drag" onClick={handleHide}
            style={{ background: 'none', border: 'none', padding: '2px 6px', fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer' }}>{'\u00D7'}</button>
        </div>
      </div>

      {/* Source text */}
      {sourceText && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, padding: '4px 8px',
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: 6, maxHeight: 36, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sourceText}
        </div>
      )}

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Capturing text loading state */}
      {waitingForText && !showHistory && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0', justifyContent: 'center' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-blue)', animation: 'pulse 1s infinite', display: 'inline-block' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontStyle: 'italic' }}>Capturing text...</span>
        </div>
      )}

      {/* Results */}
      {!waitingForText && !showHistory && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {results.map((result, idx) => (
            <div key={result.promptId}>
              {/* Show prompt name as header if multiple results */}
              {results.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-purple)', textTransform: 'uppercase' }}>{result.promptName}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {result.isStreaming && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-purple)', animation: 'pulse 1.2s infinite', display: 'inline-block' }} />}
                    {result.text && !result.isStreaming && <CopyButton text={result.text} />}
                  </div>
                </div>
              )}
              <div style={{ userSelect: 'text' }}>
                {result.isError ? <span style={{ color: 'var(--text-error)', fontSize: 12 }}>Error</span>
                  : result.text ? <StreamingText text={result.text} isStreaming={result.isStreaming} />
                  : !error && <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: 12 }}>Thinking...</div>}
              </div>
              {idx < results.length - 1 && <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', marginTop: 10 }} />}
            </div>
          ))}
        </div>
      )}

      {showHistory && <HistoryList />}

      {/* Empty state */}
      {!sourceText && !showHistory && !waitingForText && results.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0', fontSize: 12 }}>
          Select text and press a hotkey to translate
        </div>
      )}

      {/* Resize grip */}
      <div style={{
        position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, cursor: 'nwse-resize', opacity: 0.3,
        background: `linear-gradient(135deg, transparent 50%, ${isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'} 50%)`,
        borderRadius: `0 0 ${ap.borderRadius}px 0`,
      }} />
    </div>
  );
}
