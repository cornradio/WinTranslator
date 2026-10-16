import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { AppSettings, FunctionGroup, FunctionResult, TranslationEntry } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/constants';
import { streamLLM } from '../renderer/lib/api-client';
import StreamingText from '../renderer/components/StreamingText';
import CopyButton from '../renderer/components/CopyButton';
import ErrorBanner from '../renderer/components/ErrorBanner';
import { getThemeBg, isThemeDark } from '../renderer/settings-components/AppearanceTab';
import {
  addHistoryEntry,
  exportConfig,
  getHistory,
  getSelectedFunctionId,
  getSettings,
  importConfig,
  setSelectedFunctionId,
  setSetting,
  subscribeHistory,
  subscribeSettings,
} from './store';
import HistoryRail from './HistoryRail';
import PromptDrawer from './PromptDrawer';

const chatServices = [
  { name: 'Claude', url: 'https://claude.ai/new' },
  { name: 'ChatGPT', url: 'https://chatgpt.com/' },
  { name: 'Gemini', url: 'https://gemini.google.com/app' },
  { name: 'Grok', url: 'https://x.com/i/grok' },
  { name: 'DeepSeek', url: 'https://chat.deepseek.com/' },
  { name: '豆包', url: 'https://www.doubao.com/chat/' },
  { name: '通义千问', url: 'https://www.qianwen.com/' },
];

interface WorkspaceProps {
  onOpenSettings: () => void;
}

export default function Workspace({ onOpenSettings }: WorkspaceProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<TranslationEntry[]>([]);
  const [sourceText, setSourceText] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [results, setResults] = useState<FunctionResult[]>([]);
  const [activeGroup, setActiveGroup] = useState<FunctionGroup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [tabMenu, setTabMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController[]>([]);
  const runTokenRef = useRef(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loaded = getSettings();
    setSettings(loaded);
    setHistory(getHistory());
    const savedId = getSelectedFunctionId();
    setSelectedId(savedId && loaded.functions.some((group) => group.id === savedId)
      ? savedId
      : loaded.functions[0]?.id || '');
    const unsubSettings = subscribeSettings((next) => {
      setSettings(next);
      setSelectedId((current) => (
        next.functions.some((group) => group.id === current) ? current : next.functions[0]?.id || ''
      ));
    });
    const unsubHistory = subscribeHistory(setHistory);
    return () => {
      unsubSettings();
      unsubHistory();
    };
  }, []);

  const selected = settings.functions.find((group) => group.id === selectedId) || settings.functions[0];
  const isStreaming = results.some((result) => result.isStreaming);
  const theme = settings.appearance.theme;
  const isDark = isThemeDark(theme);
  const hasText = sourceText.trim().length > 0;

  const chooseFunction = (id: string) => {
    setSelectedId(id);
    setSelectedFunctionId(id);
  };

  const updateFunctions = (next: AppSettings['functions']) => {
    setSetting('functions', next);
  };

  const addTemplate = () => {
    const group: AppSettings['functions'][number] = {
      id: crypto.randomUUID(),
      name: '新模板',
      icon: '✦',
      hotkey: '',
      showInMenu: true,
      prompts: [{ id: crypto.randomUUID(), name: 'Prompt 1', prompt: 'Process the input text.' }],
    };
    updateFunctions([...getSettings().functions, group]);
    chooseFunction(group.id);
    setEditingId(group.id);
  };

  const deleteTemplate = (id: string) => {
    const current = getSettings().functions;
    if (current.length <= 1) {
      window.alert('至少保留一个模板。');
      return;
    }
    const next = current.filter((group) => group.id !== id);
    updateFunctions(next);
    if (selectedId === id) chooseFunction(next[0].id);
    if (editingId === id) setEditingId(null);
  };

  const downloadConfig = () => {
    const json = exportConfig();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wintranslator-config-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importConfigFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        importConfig(await file.text());
      } catch (err) {
        window.alert('导入失败：' + (err as Error).message);
      }
    };
    input.click();
  };

  const stopStreaming = () => {
    abortRef.current.forEach((controller) => controller.abort());
    abortRef.current = [];
    setResults((prev) => prev.map((result) => ({ ...result, isStreaming: false })));
  };

  const runGroup = useCallback((group: FunctionGroup, text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !settings.ai.apiKey) return;
    abortRef.current.forEach((controller) => controller.abort());
    abortRef.current = [];
    const token = ++runTokenRef.current;
    setError(null);
    setActiveGroup(group);
    const queryId = crypto.randomUUID();
    const initial: FunctionResult[] = group.prompts.map((prompt) => ({
      promptId: prompt.id,
      promptName: prompt.name,
      text: '',
      isStreaming: true,
      isError: false,
    }));
    setResults(initial);

    group.prompts.forEach((prompt, index) => {
      const promptBody = prompt.prompt.replace('{text}', '').trim();
      const userText = `<prompt>\n${promptBody}\n</prompt>\n<input>\n${trimmed}\n</input>`;
      let accumulated = '';
      const controller = streamLLM({
        provider: settings.ai.provider,
        apiKey: settings.ai.apiKey,
        model: settings.ai.model,
        baseUrl: settings.ai.baseUrl,
        systemPrompt: '',
        userText,
        maxTokens: settings.ai.maxTokens,
        thinking: settings.ai.thinking,
        onChunk: (chunk) => {
          if (runTokenRef.current !== token) return;
          accumulated += chunk;
          setResults((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], text: accumulated, isStreaming: true };
            return next;
          });
        },
        onDone: () => {
          if (runTokenRef.current !== token) return;
          setResults((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], isStreaming: false };
            return next;
          });
          if (accumulated) {
            addHistoryEntry({
              id: crypto.randomUUID(),
              queryId,
              timestamp: Date.now(),
              sourceText: trimmed,
              resultText: accumulated,
              groupName: group.name,
              groupIcon: group.icon,
              promptName: prompt.name,
            });
          }
        },
        onError: (message) => {
          if (runTokenRef.current !== token) return;
          setResults((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], isStreaming: false, isError: true };
            return next;
          });
          const cors = /failed to fetch|networkerror|load failed/i.test(message);
          setError(cors
            ? `${message}。浏览器直接请求被接口拒绝时，把 Base URL 换成允许当前网页来源的兼容接口。`
            : message);
        },
      });
      abortRef.current.push(controller);
    });
  }, [settings.ai]);

  const handlePrimary = async () => {
    if (!selected || isStreaming || !settings.ai.apiKey) return;
    if (hasText) {
      runGroup(selected, sourceText);
      return;
    }
    try {
      const clip = await navigator.clipboard.readText();
      setSourceText(clip);
      if (!clip.trim()) {
        setError('剪贴板是空的，请先复制文字再粘贴并分析。');
        return;
      }
      runGroup(selected, clip);
    } catch {
      setError('无法读取剪贴板。请允许本页剪贴板权限，或手动粘贴后再点分析。');
      areaRef.current?.focus();
    }
  };

  const handleClear = () => {
    if (isStreaming) stopStreaming();
    setSourceText('');
    setResults([]);
    setActiveGroup(null);
    setError(null);
    areaRef.current?.focus();
  };

  useEffect(() => {
    if (!tabMenu) return;
    const close = () => setTabMenu(null);
    window.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [tabMenu]);

  useEffect(() => {
    if (!chatOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) setChatOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [chatOpen]);

  const pageStyle = useMemo(() => {
    const ink = isDark ? 'rgba(255,255,255,0.92)' : 'rgba(28, 24, 18, 0.9)';
    const mute = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(28, 24, 18, 0.55)';
    return {
      ['--text-primary' as string]: ink,
      ['--text-secondary' as string]: mute,
      ['--text-error' as string]: '#ff453a',
      ['--accent-blue' as string]: theme === 'monokai' ? '#66d9ef' : '#0a84ff',
      ['--accent-purple' as string]: theme === 'monokai' ? '#ae81ff' : '#bf5af2',
      ['--accent-green' as string]: theme === 'monokai' ? '#a6e22e' : '#30d158',
      ['--card' as string]: getThemeBg(theme, Math.max(settings.appearance.opacity, 0.92)),
      ['--line' as string]: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(40, 28, 12, 0.1)',
      ['--radius' as string]: `${settings.appearance.borderRadius}px`,
    } as CSSProperties;
  }, [isDark, settings.appearance.borderRadius, settings.appearance.opacity, theme]);

  const hasOutput = results.some((result) => result.text);
  const missingKey = !settings.ai.apiKey;

  const sendToChat = async (url: string) => {
    const parts: string[] = [];
    if (sourceText.trim()) parts.push(`[Source]\n${sourceText.trim()}`);
    results.forEach((result) => {
      if (result.text) {
        parts.push(results.length > 1 ? `[${result.promptName}]\n${result.text}` : `[Result]\n${result.text}`);
      }
    });
    if (parts.length) await navigator.clipboard.writeText(parts.join('\n\n'));
    window.open(url, '_blank', 'noopener,noreferrer');
    setChatOpen(false);
  };

  return (
    <div className={`web-app theme-${theme} ${isDark ? 'dark' : 'light'}`} style={pageStyle}>
      <div className="atmosphere" />
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">Wt</span>
          <div>
            <strong>WinTranslator</strong>
            <span>选一段文字，交给你配置的模型</span>
          </div>
        </div>
        <div className="top-actions">
          <button type="button" className="textish" onClick={importConfigFile}>导入配置</button>
          <button type="button" onClick={downloadConfig}>导出配置</button>
          <button type="button" className="gear" aria-label="设置" onClick={onOpenSettings}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="desk">
        <main className="stage">
          <nav className="fn-tabs" aria-label="功能">
            {settings.functions.map((group) => (
              <button
                key={group.id}
                type="button"
                className={selected?.id === group.id ? 'tab on' : 'tab'}
                onClick={() => chooseFunction(group.id)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setTabMenu({ x: event.clientX, y: event.clientY, id: group.id });
                }}
              >
                <span className="fn-icon">{group.icon}</span>
                <span>{group.name}</span>
              </button>
            ))}
            <button type="button" className="tab add-tab" aria-label="添加模板" onClick={addTemplate}>+</button>
          </nav>
          {tabMenu && (
            <div className="tab-menu" style={{ left: tabMenu.x, top: tabMenu.y }} onMouseDown={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => { setEditingId(tabMenu.id); setTabMenu(null); }}>编辑模板</button>
              <button type="button" className="danger" onClick={() => {
                const group = settings.functions.find((item) => item.id === tabMenu.id);
                if (group && window.confirm(`删除模板「${group.name}」？`)) deleteTemplate(tabMenu.id);
                setTabMenu(null);
              }}>删除模板</button>
            </div>
          )}

          <section className="composer">
            <div className="composer-label">
              <span>
                输入
                {selected && (
                  <>
                    {' → '}
                    {selected.prompts.map((prompt) => prompt.name).join('、')}
                  </>
                )}
              </span>
              <span>{sourceText.length}</span>
            </div>
            <textarea
              ref={areaRef}
              value={sourceText}
              placeholder={selected ? `粘贴或输入文字，用「${selected.name}」处理。Enter 分析，Shift + Enter 换行。` : '粘贴或输入要处理的文字'}
              onChange={(event) => setSourceText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
                event.preventDefault();
                if (sourceText.trim()) void handlePrimary();
              }}
            />
            <div className="action-row">
              <button
                type="button"
                className="primary run"
                disabled={!selected || isStreaming || missingKey}
                onClick={() => void handlePrimary()}
              >
                {isStreaming ? '生成中…' : hasText ? 'Enter' : '粘贴并分析'}
              </button>
              <button type="button" className="clear-btn" onClick={handleClear} disabled={!hasText && results.length === 0 && !error}>
                清空
              </button>
              {isStreaming && (
                <button type="button" className="textish" onClick={stopStreaming}>停止</button>
              )}
            </div>
            {missingKey && (
              <p className="key-hint">还没有 API Key。点右上角齿轮，填入 Base URL、模型和密钥。</p>
            )}
          </section>

          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

          {results.length > 0 && (
            <section className="output">
              <div className="output-head">
                <div>
                  <span className="output-icon">{activeGroup?.icon}</span>
                  <strong>{activeGroup?.name}</strong>
                  {isStreaming && <i className="pulse" />}
                </div>
                <div className="output-tools">
                  {hasOutput && (
                    <div className="chat-wrap" ref={chatRef}>
                      <button type="button" className="textish" onClick={() => setChatOpen((open) => !open)}>继续聊</button>
                      {chatOpen && (
                        <div className="chat-menu">
                          {chatServices.map((service) => (
                            <button key={service.name} type="button" onClick={() => sendToChat(service.url)}>
                              {service.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {results.length === 1 && results[0].text && <CopyButton text={results[0].text} />}
                </div>
              </div>
              <div className="result-stack">
                {results.map((result, index) => (
                  <article key={result.promptId}>
                    {results.length > 1 && (
                      <div className="prompt-head">
                        <span>{result.promptName}</span>
                        <span>
                          {result.isStreaming && <i className="pulse" />}
                          {result.text && !result.isStreaming && <CopyButton text={result.text} />}
                        </span>
                      </div>
                    )}
                    {result.isError && !result.text
                      ? <div className="result-error">请求失败</div>
                      : result.text
                        ? <StreamingText text={result.text} isStreaming={result.isStreaming} />
                        : <div className="thinking">思考中…</div>}
                    {index < results.length - 1 && <hr />}
                  </article>
                ))}
              </div>
            </section>
          )}

          <HistoryRail
            entries={history}
            activeName={selected?.name}
            onReuse={(text, groupName) => {
              setSourceText(text);
              const match = settings.functions.find((group) => group.name === groupName);
              if (match) chooseFunction(match.id);
              areaRef.current?.focus();
            }}
          />
        </main>
      </div>
      {editingId && settings.functions.some((group) => group.id === editingId) && (
        <PromptDrawer
          group={settings.functions.find((group) => group.id === editingId)!}
          onChange={(next) => updateFunctions(getSettings().functions.map((group) => (group.id === next.id ? next : group)))}
          onClose={() => setEditingId(null)}
          onDelete={() => deleteTemplate(editingId)}
        />
      )}
    </div>
  );
}
