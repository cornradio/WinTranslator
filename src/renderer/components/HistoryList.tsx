import { useState, useEffect } from 'react';
import type { TranslationEntry } from '../../shared/types';
import CopyButton from './CopyButton';

export default function HistoryList() {
  const [entries, setEntries] = useState<TranslationEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electronAPI?.history.getAll().then((data) => {
      setEntries(data);
      setLoading(false);
    });

    const unsub = window.electronAPI?.history.onUpdated((data) => {
      setEntries(data);
    });

    return () => unsub?.();
  }, []);

  const handleDelete = async (id: string) => {
    await window.electronAPI?.history.delete(id);
  };

  const handleClear = async () => {
    await window.electronAPI?.history.clear();
  };

  if (loading) {
    return (
      <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
        Loading...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
      }}>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          {entries.length} entries
        </span>
        {entries.length > 0 && (
          <button className="danger" onClick={handleClear} style={{ fontSize: '11px', padding: '2px 8px' }}>
            Clear All
          </button>
        )}
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0', fontSize: '12px' }}>
          🕐 No history yet
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          maxHeight: '300px',
          overflowY: 'auto',
        }}>
          {entries.map((entry) => (
            <div key={entry.id}>
              {/* Collapsed row */}
              <div
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                style={{
                  padding: '6px 8px',
                  background: expandedId === entry.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '12px' }}>
                    {'⚡'}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}>
                    {entry.groupName || entry.promptName || "Function"}
                    {entry.promptName ? ` · ${entry.promptName}` : ''}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                    {new Date(entry.timestamp).toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {entry.sourceText}
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === entry.id && (
                <div style={{
                  padding: '8px',
                  marginTop: '4px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {/* Original */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                      ORIGINAL
                    </div>
                    <div style={{
                      fontSize: '12px',
                      padding: '6px 8px',
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: '4px',
                      userSelect: 'text',
                      maxHeight: '80px',
                      overflowY: 'auto',
                    }}>
                      {entry.sourceText}
                    </div>
                  </div>

                  {/* Result */}
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '4px',
                    }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        RESULT
                      </span>
                      <CopyButton text={entry.resultText} />
                    </div>
                    <div style={{
                      fontSize: '12px',
                      padding: '6px 8px',
                      background: 'rgba(10, 132, 255, 0.06)',
                      borderRadius: '4px',
                      userSelect: 'text',
                      maxHeight: '120px',
                      overflowY: 'auto',
                    }}>
                      {entry.resultText}
                    </div>
                  </div>

                  {/* Delete */}
                  <div style={{ marginTop: '8px', textAlign: 'right' }}>
                    <button
                      className="danger"
                      onClick={() => handleDelete(entry.id)}
                      style={{ fontSize: '11px', padding: '2px 8px' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
