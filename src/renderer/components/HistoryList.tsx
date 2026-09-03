import { useState, useEffect, useRef, useMemo } from 'react';
import type { TranslationEntry, FunctionGroup } from '../../shared/types';
import CopyButton from './CopyButton';

interface HistoryListProps {
  functions?: FunctionGroup[];
  onLoad?: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  entryId: string;
}

const FILTER_ALL = '__all__';
const FILTER_STARRED = '__starred__';

export default function HistoryList({ functions, onLoad }: HistoryListProps) {
  const [entries, setEntries] = useState<TranslationEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(FILTER_ALL);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const iconMap = new Map<string, string>();
  if (functions) {
    for (const g of functions) iconMap.set(g.name, g.icon);
  }

  const getIcon = (entry: TranslationEntry) =>
    entry.groupIcon || (entry.groupName ? iconMap.get(entry.groupName) : undefined);

  useEffect(() => {
    window.electronAPI?.history.getAll().then((data) => {
      setEntries(data);
      if (data.length > 0) setSelectedId(data[0].id);
      setLoading(false);
      onLoad?.();
    });

    const unsub = window.electronAPI?.history.onUpdated((data) => {
      setEntries(data);
      onLoad?.();
    });

    return () => unsub?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  const groupNames = useMemo(() => {
    const names = new Set<string>();
    for (const e of entries) {
      if (e.groupName) names.add(e.groupName);
    }
    return Array.from(names).sort();
  }, [entries]);

  const starredCount = useMemo(() => entries.filter((e) => e.starred).length, [entries]);

  const filtered = useMemo(() => {
    if (filter === FILTER_ALL) return entries;
    if (filter === FILTER_STARRED) return entries.filter((e) => e.starred);
    return entries.filter((e) => e.groupName === filter);
  }, [entries, filter]);

  const handleDelete = async (id: string) => {
    await window.electronAPI?.history.delete(id);
    if (selectedId === id) {
      const remaining = filtered.filter((e) => e.id !== id);
      setSelectedId(remaining[0]?.id ?? null);
    }
    setContextMenu(null);
  };

  const handleToggleStar = async (id: string) => {
    await window.electronAPI?.history.toggleStar(id);
    setContextMenu(null);
  };

  const handleClear = async () => {
    await window.electronAPI?.history.clear();
    setSelectedId(null);
  };

  const handleContextMenu = (e: React.MouseEvent, entryId: string) => {
    e.preventDefault();
    setSelectedId(entryId);
    setContextMenu({ x: e.clientX, y: e.clientY, entryId });
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setContextMenu(null);
  };

  const handleExport = () => {
    const rows = filtered.map((e) => [
      new Date(e.timestamp).toLocaleString('zh-CN'),
      e.groupName || '',
      e.promptName || '',
      e.starred ? 'Yes' : '',
      e.sourceText,
      e.resultText,
    ]);

    const header = ['Time', 'Function', 'Prompt', 'Starred', 'Original', 'Result'];
    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => '"' + String(cell).replace(/"/g, '""') + '"').join(','))
      .join('\n');

    const bom = '﻿';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wintranslator-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selected = entries.find((e) => e.id === selectedId);
  const contextEntry = contextMenu ? entries.find((e) => e.id === contextMenu.entryId) : null;

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
        Loading...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '60px 0', fontSize: 12 }}>
        No history yet
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left: entry list */}
      <div style={{
        width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
      }}>
        {/* Filter + actions */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '10px 10px 8px', flexShrink: 0,
        }}>
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setSelectedId(null); }}
            style={{
              flex: 1, fontSize: 11, padding: '3px 6px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4, color: 'rgba(255,255,255,0.8)',
            }}
          >
            <option value={FILTER_ALL}>All ({entries.length})</option>
            {starredCount > 0 && (
              <option value={FILTER_STARRED}>{'⭐'} Starred ({starredCount})</option>
            )}
            {groupNames.map((name) => (
              <option key={name} value={name}>
                {name} ({entries.filter((e) => e.groupName === name).length})
              </option>
            ))}
          </select>
        </div>

        {/* Action buttons */}
        <div style={{
          display: 'flex', gap: 4, padding: '0 10px 8px', flexShrink: 0,
        }}>
          <button onClick={handleExport} style={{ flex: 1, fontSize: 10, padding: '2px 0' }}>
            Export
          </button>
          <button className="danger" onClick={handleClear} style={{ fontSize: 10, padding: '2px 6px' }}>
            Clear
          </button>
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 6px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '20px 0', fontSize: 11 }}>
              No entries
            </div>
          ) : filtered.map((entry) => {
            const isActive = entry.id === selectedId;
            return (
              <div
                key={entry.id}
                onClick={() => setSelectedId(entry.id)}
                onContextMenu={(e) => handleContextMenu(e, entry.id)}
                style={{
                  padding: '6px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  marginBottom: 2,
                  background: isActive ? 'rgba(10,132,255,0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(10,132,255,0.2)' : '1px solid transparent',
                  transition: 'background 0.12s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  {entry.starred && <span style={{ fontSize: 10 }}>{'⭐'}</span>}
                  {getIcon(entry) && <span style={{ fontSize: 11 }}>{getIcon(entry)}</span>}
                  <span style={{
                    fontSize: 10, color: isActive ? '#0a84ff' : 'rgba(255,255,255,0.45)',
                    fontWeight: 600, textTransform: 'uppercase',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                  }}>
                    {entry.groupName || 'Function'}
                  </span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                    {new Date(entry.timestamp).toLocaleString('zh-CN', {
                      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                <div style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.75)', opacity: isActive ? 1 : 0.8,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {entry.sourceText}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: detail panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '10px 16px' }}>
        {selected ? (
          <>
            {/* Detail header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              paddingBottom: 10, flexShrink: 0,
              borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {getIcon(selected) && <span style={{ fontSize: 14 }}>{getIcon(selected)}</span>}
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {selected.groupName || 'Function'}
                </span>
                {selected.promptName && (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                    · {selected.promptName}
                  </span>
                )}
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>
                  {new Date(selected.timestamp).toLocaleString('zh-CN')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => handleToggleStar(selected.id)}
                  title={selected.starred ? 'Unstar' : 'Star'}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                    fontSize: 14, color: selected.starred ? '#ffcc00' : 'rgba(255,255,255,0.25)',
                    transition: 'color 0.15s',
                  }}
                >
                  {selected.starred ? '★' : '☆'}
                </button>
                <button className="danger" onClick={() => handleDelete(selected.id)}
                  style={{ fontSize: 10, padding: '2px 8px' }}>
                  Delete
                </button>
              </div>
            </div>

            {/* Source */}
            <div style={{ marginBottom: 12, flexShrink: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase', letterSpacing: '0.3px',
                }}>
                  Original
                </span>
                <CopyButton text={selected.sourceText} />
              </div>
              <div style={{
                fontSize: 12, lineHeight: 1.6, padding: '8px 10px',
                background: 'rgba(255,255,255,0.04)', borderRadius: 6,
                userSelect: 'text', maxHeight: 120, overflowY: 'auto',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {selected.sourceText}
              </div>
            </div>

            {/* Result */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 4, flexShrink: 0,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase', letterSpacing: '0.3px',
                }}>
                  Result
                </span>
                <CopyButton text={selected.resultText} />
              </div>
              <div style={{
                flex: 1, fontSize: 12, lineHeight: 1.6, padding: '8px 10px',
                background: 'rgba(10,132,255,0.05)', borderRadius: 6,
                border: '1px solid rgba(10,132,255,0.08)',
                userSelect: 'text', overflowY: 'auto',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {selected.resultText}
              </div>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.3)', fontSize: 12,
          }}>
            Select an entry to view details
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && contextEntry && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 1000,
            background: 'rgba(40,40,44,0.98)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '4px 0', minWidth: 160,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <ContextMenuItem
            label={contextEntry.starred ? '★ Unstar' : '☆ Star'}
            onClick={() => handleToggleStar(contextEntry.id)}
          />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
          <ContextMenuItem label="Copy Original" onClick={() => handleCopyText(contextEntry.sourceText)} />
          <ContextMenuItem label="Copy Result" onClick={() => handleCopyText(contextEntry.resultText)} />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
          <ContextMenuItem label="Delete" danger onClick={() => handleDelete(contextEntry.id)} />
        </div>
      )}
    </div>
  );
}

function ContextMenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '5px 14px', fontSize: 12, cursor: 'pointer',
        color: danger ? '#ff453a' : 'rgba(255,255,255,0.85)',
        background: hover ? 'rgba(255,255,255,0.08)' : 'transparent',
      }}
    >
      {label}
    </div>
  );
}
