import { useMemo, useState } from 'react';
import type { TranslationEntry } from '../shared/types';
import StreamingText from '../renderer/components/StreamingText';
import CopyButton from '../renderer/components/CopyButton';
import { deleteHistoryEntries, setHistoryStars } from './store';

interface HistoryRailProps {
  entries: TranslationEntry[];
  activeName?: string;
  onReuse: (source: string, groupName?: string) => void;
}

interface QueryGroup {
  id: string;
  timestamp: number;
  sourceText: string;
  groupName?: string;
  groupIcon?: string;
  starred: boolean;
  entries: TranslationEntry[];
}

const FILTER_ALL = '__all__';
const FILTER_STARRED = '__starred__';

function groupQueries(entries: TranslationEntry[]): QueryGroup[] {
  const order: string[] = [];
  const map = new Map<string, TranslationEntry[]>();
  for (const entry of entries) {
    const key = entry.queryId || entry.id;
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(entry);
  }
  return order.map((id) => {
    const items = map.get(id)!;
    return {
      id,
      timestamp: Math.max(...items.map((item) => item.timestamp)),
      sourceText: items[0].sourceText,
      groupName: items[0].groupName,
      groupIcon: items[0].groupIcon,
      starred: items.every((item) => item.starred),
      entries: items,
    };
  });
}

export default function HistoryRail({ entries, activeName, onReuse }: HistoryRailProps) {
  const [filter, setFilter] = useState(FILTER_ALL);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const groups = useMemo(
    () => groupQueries(entries).filter((group) => !activeName || group.groupName === activeName),
    [entries, activeName],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return groups.filter((group) => {
      if (filter === FILTER_STARRED && !group.starred) return false;
      if (!needle) return true;
      const blob = [
        group.sourceText,
        group.groupName || '',
        ...group.entries.map((entry) => `${entry.promptName || ''} ${entry.resultText}`),
      ].join('\n').toLowerCase();
      return blob.includes(needle);
    });
  }, [groups, filter, query]);

  const deleteQuery = (group: QueryGroup) => {
    deleteHistoryEntries(group.entries.map((entry) => entry.id));
    if (expandedId === group.id) setExpandedId(null);
  };

  const toggleStar = (group: QueryGroup) => {
    setHistoryStars(group.entries.map((entry) => entry.id), !group.starred);
  };

  return (
    <section className="rail">
      <div className="rail-head">
        <h2>历史</h2>
        <div className="chip-row rail-filters">
          <button type="button" className={filter === FILTER_ALL ? 'chip on' : 'chip'} onClick={() => setFilter(FILTER_ALL)}>
            全部 {groups.length}
          </button>
          <button type="button" className={filter === FILTER_STARRED ? 'chip on' : 'chip'} onClick={() => setFilter(FILTER_STARRED)}>
            收藏
          </button>
        </div>
      </div>

      <div className="rail-tools">
        <input
          className="rail-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索原文或结果"
        />
        <div className="rail-actions">
          <button
            type="button"
            className="danger"
            disabled={groups.length === 0}
            onClick={() => {
              if (groups.length === 0) return;
              if (window.confirm('清空当前模板的历史记录？此操作无法撤销。')) {
                deleteHistoryEntries(groups.flatMap((group) => group.entries.map((entry) => entry.id)));
                setExpandedId(null);
              }
            }}
          >
            清空
          </button>
        </div>
      </div>

      <div className="rail-list">
        {groups.length === 0 && <div className="rail-empty">这个模板还没有记录。分析一次之后，结果会留在这里。</div>}
        {groups.length > 0 && filtered.length === 0 && <div className="rail-empty">没有符合条件的记录。</div>}
        {filtered.map((group) => {
          const expanded = expandedId === group.id;
          return (
            <article key={group.id} className={`hist ${expanded ? 'expanded' : ''}`}>
              <div className="hist-top">
                <button type="button" className="hist-open" onClick={() => setExpandedId(expanded ? null : group.id)}>
                  <span className="hist-meta">
                    <time>{new Date(group.timestamp).toLocaleString('zh-CN', {
                      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                    })}</time>
                  </span>
                  <span className="hist-source">{group.sourceText}</span>
                  {!expanded && (
                    <span className="hist-preview">
                      {group.entries.map((entry) => entry.resultText).filter(Boolean).join('  ·  ') || '无结果'}
                    </span>
                  )}
                </button>
                <button type="button" className="icon-btn" title={group.starred ? '取消收藏' : '收藏'} onClick={() => toggleStar(group)}>
                  {group.starred ? '★' : '☆'}
                </button>
                <button type="button" className="icon-btn danger-text" title="删除" onClick={() => deleteQuery(group)}>
                  删除
                </button>
              </div>
              {expanded && (
                <div className="hist-body">
                  {group.entries.map((entry) => (
                    <section key={entry.id} className="hist-result">
                      <div className="hist-result-head">
                        <span>{entry.promptName || 'Result'}</span>
                        <CopyButton text={entry.resultText} />
                      </div>
                      <StreamingText text={entry.resultText || '（空）'} isStreaming={false} />
                    </section>
                  ))}
                  <div className="hist-foot">
                    <button type="button" onClick={() => onReuse(group.sourceText, group.groupName)}>填回输入框</button>
                    <CopyButton text={group.entries.map((entry) => entry.resultText).filter(Boolean).join('\n\n')} />
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
