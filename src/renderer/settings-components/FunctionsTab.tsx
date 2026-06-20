import { useState, useCallback } from 'react';
import type { FunctionGroup, PromptTemplate } from '../../shared/types';

const isMac = navigator.platform.toLowerCase().includes('mac');

function formatHotkeyPart(part: string): string {
  if (!isMac) return part;
  if (part === 'Alt') return 'Option';
  if (part === 'Command') return 'Command';
  return part;
}

function formatHotkey(hotkey: string): string {
  return hotkey.split('+').map(formatHotkeyPart).join('+');
}

interface FunctionsTabProps {
  functions: FunctionGroup[];
  onChange: (functions: FunctionGroup[]) => void;
  onExport: () => void;
  onImport: () => void;
}

export default function FunctionsTab({ functions, onChange, onExport, onImport }: FunctionsTabProps) {
  const [selectedId, setSelectedId] = useState<string>(functions[0]?.id || '');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const selected = functions.find((f) => f.id === selectedId);

  const updateGroup = useCallback((id: string, updates: Partial<FunctionGroup>) => {
    onChange(functions.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }, [functions, onChange]);

  const addGroup = () => {
    const newGroup: FunctionGroup = {
      id: crypto.randomUUID(),
      name: 'New Function',
      icon: '\u{1F6E0}\u{FE0F}',
      hotkey: '',
      showInMenu: true,
      prompts: [{
        id: crypto.randomUUID(),
        name: 'Prompt 1',
        prompt: '{text}',
      }],
    };
    onChange([...functions, newGroup]);
    setSelectedId(newGroup.id);
  };

  const removeGroup = (id: string) => {
    const next = functions.filter((f) => f.id !== id);
    onChange(next);
    if (selectedId === id) setSelectedId(next[0]?.id || '');
  };

  const addPrompt = (groupId: string) => {
    const group = functions.find((f) => f.id === groupId);
    if (!group) return;
    const newPrompt: PromptTemplate = {
      id: crypto.randomUUID(),
      name: `Prompt ${group.prompts.length + 1}`,
      prompt: '{text}',
    };
    updateGroup(groupId, { prompts: [...group.prompts, newPrompt] });
  };

  const updatePrompt = (groupId: string, promptId: string, updates: Partial<PromptTemplate>) => {
    const group = functions.find((f) => f.id === groupId);
    if (!group) return;
    updateGroup(groupId, {
      prompts: group.prompts.map((p) => (p.id === promptId ? { ...p, ...updates } : p)),
    });
  };

  const removePrompt = (groupId: string, promptId: string) => {
    const group = functions.find((f) => f.id === groupId);
    if (!group || group.prompts.length <= 1) return;
    updateGroup(groupId, { prompts: group.prompts.filter((p) => p.id !== promptId) });
  };

  // Hotkey recorder
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const startRecording = useCallback((groupId: string) => {
    setRecordingId(groupId);

    // Helper: extract the physical key from a KeyboardEvent.
    // On macOS, Option+letter produces dead keys (e.key = "Dead") because
    // Option is the system compose modifier. e.code gives the physical key
    // (e.g. "KeyE" → "E", "Digit1" → "1", "F5" → "F5").
    const resolveKey = (e: KeyboardEvent): string => {
      const { key: rawKey, code } = e;
      if (rawKey === 'Dead' || (rawKey.length > 1 && !/^[A-Za-z0-9]$/.test(rawKey))) {
        if (code.startsWith('Key')) return code.slice(3).toUpperCase();
        if (code.startsWith('Digit')) return code.slice(5);
        return code; // F5, BracketLeft, ArrowUp, etc.
      }
      return rawKey.toUpperCase();
    };

    let timeoutId: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('keydown', handler, true);
      setRecordingId(null);
    };

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Skip pure modifier keys — wait for the actual key
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push(isMac ? 'Command' : 'Super');
      parts.push(resolveKey(e));

      updateGroup(groupId, { hotkey: parts.join('+') });
      cleanup();
    };

    window.addEventListener('keydown', handler, true);
    timeoutId = setTimeout(cleanup, 5000);
  }, [updateGroup]);

  const kbdStyle: React.CSSProperties = {
    padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: 3,
    border: '1px solid rgba(255,255,255,0.15)', fontSize: 11, fontFamily: 'var(--font-mono)',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 6, display: 'block',
  };

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      {/* Left: function list */}
      <div style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Functions ({functions.length})
        </div>
        {functions.map((f) => (
          <div
            key={f.id}
            onClick={() => setSelectedId(f.id)}
            onMouseEnter={() => setHoveredId(f.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
              background: f.id === selectedId ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: f.id === selectedId ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
              transition: 'all 0.15s', position: 'relative',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{f.icon}</span> {f.name}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              {f.hotkey ? formatHotkey(f.hotkey) : 'No hotkey'} · {f.prompts.length} prompt{f.prompts.length !== 1 ? 's' : ''}
            </div>
            {hoveredId === f.id && (
              <div
                onClick={(e) => { e.stopPropagation(); removeGroup(f.id); }}
                style={{
                  position: 'absolute', right: 6, top: 6, width: 18, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 4, background: 'rgba(255,69,58,0.15)', color: '#ff453a',
                  fontSize: 12, lineHeight: 1, cursor: 'pointer',
                }}
              >x</div>
            )}
          </div>
        ))}
        <button onClick={addGroup} style={{ marginTop: 8, fontSize: 12 }}>+ Add Function</button>
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          <button onClick={onExport} style={{ flex: 1, fontSize: 10, padding: '3px 0' }}>Export</button>
          <button onClick={onImport} style={{ flex: 1, fontSize: 10, padding: '3px 0' }}>Import</button>
        </div>
        <a onClick={() => window.electronAPI?.popup.openUrl('https://github.com/cornradio/WinTranslator/blob/master/functions.md')}
          style={{ marginTop: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.3)', textDecoration: 'underline', cursor: 'pointer' }}>
          View function examples
        </a>
      </div>

      {/* Right: editor */}
      {selected ? (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Group name + icon */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div>
              <label style={labelStyle}>Icon</label>
              <input type="text" value={selected.icon}
                onChange={(e) => updateGroup(selected.id, { icon: e.target.value })}
                style={{ width: 50, textAlign: 'center', fontSize: 18, padding: '4px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Name</label>
              <input type="text" value={selected.name}
                onChange={(e) => updateGroup(selected.id, { name: e.target.value })}
                style={{ width: '100%' }} />
            </div>
          </div>

          {/* Hotkey */}
          <div>
            <label style={labelStyle}>Hotkey</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div onClick={() => startRecording(selected.id)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                background: recordingId === selected.id ? 'rgba(10,132,255,0.15)' : 'rgba(255,255,255,0.06)',
                border: '1px solid ' + (recordingId === selected.id ? '#0a84ff' : 'rgba(255,255,255,0.12)'),
                borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12, minWidth: 100,
              }}>
                {recordingId === selected.id ? (
                  <span style={{ color: '#0a84ff', animation: 'pulse 1s infinite' }}>Press keys...</span>
                ) : selected.hotkey ? (
                  selected.hotkey.split('+').map((k, i) => (
                    <span key={i}>{i > 0 && <span style={{ color: 'rgba(255,255,255,0.4)' }}> + </span>}<kbd style={kbdStyle}>{formatHotkeyPart(k)}</kbd></span>
                  ))
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>Click to record</span>
                )}
              </div>
              {selected.hotkey && (
                <button onClick={() => updateGroup(selected.id, { hotkey: '' })}
                  style={{ fontSize: 10, padding: '2px 6px' }}>Clear</button>
              )}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
              Multiple functions can share the same hotkey to run in parallel.
            </div>
          </div>

          {/* Menu toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div onClick={() => updateGroup(selected.id, { showInMenu: !selected.showInMenu })} style={{
              width: 36, height: 20, borderRadius: 10, cursor: 'pointer', position: 'relative', flexShrink: 0,
              background: selected.showInMenu ? '#0a84ff' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s',
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2,
                left: selected.showInMenu ? 18 : 2, transition: 'left 0.2s',
              }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>Show in Tray Menu</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Right-click tray icon to access this function</div>
            </div>
          </div>

          {/* Prompts */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Prompts ({selected.prompts.length})</label>
              <button onClick={() => addPrompt(selected.id)} style={{ fontSize: 11, padding: '2px 8px' }}>+ Add Prompt</button>
            </div>
            {selected.prompts.map((p) => (
              <div key={p.id} style={{
                padding: 12, marginBottom: 8, background: 'rgba(255,255,255,0.03)',
                borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input type="text" value={p.name}
                    onChange={(e) => updatePrompt(selected.id, p.id, { name: e.target.value })}
                    style={{ flex: 1, fontWeight: 500 }} placeholder="Prompt name" />
                  {selected.prompts.length > 1 && (
                    <button className="danger" onClick={() => removePrompt(selected.id, p.id)}
                      style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 6px' }}>Remove</button>
                  )}
                </div>
                <textarea value={p.prompt}
                  onChange={(e) => updatePrompt(selected.id, p.id, { prompt: e.target.value })}
                  rows={4} style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.5, resize: 'vertical' }} />
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                  Use {'{text}'} as placeholder for selected text
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
          Select a function or create a new one
        </div>
      )}
    </div>
  );
}
