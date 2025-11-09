// src/app/components/HistorySidebar.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Message = { role?: string; content?: any };
type Session = { id?: string; title?: string; messages?: Message[] };
type Entry = {
  id: string;
  title: string;
  createdAt: string;
  lastOpenedAt?: string;
  session: Session;
};

declare global {
  interface Window {
    wasedaAIHistory?: {
      list: () => Entry[];
      remove: (id: string) => void;
      get: (id: string) => Entry | null;
    };
  }
}

const HISTORY_KEY = 'wasedaai_history_v1';
const PIN_KEY = 'wasedaai_pins_v1';
const COLLAPSE_KEY = 'wasedaai_history_collapsed_v1';

function loadPins(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(PIN_KEY) || '{}');
  } catch {
    return {};
  }
}
function savePins(p: Record<string, boolean>) {
  localStorage.setItem(PIN_KEY, JSON.stringify(p));
}

function loadCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveCollapsed(c: Record<string, boolean>) {
  localStorage.setItem(COLLAPSE_KEY, JSON.stringify(c));
}

function readHistoryRaw(): Entry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function renameEntry(id: string, newTitle: string) {
  const all = readHistoryRaw();
  const idx = all.findIndex((e) => e.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], title: newTitle.trim() || all[idx].title };
    localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event('storage')); // 画面内更新用
  }
}

function daysDiff(aISO: string, bISO: string) {
  const a = new Date(aISO);
  const b = new Date(bISO);
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  const diff = (da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24);
  return Math.round(diff);
}

type SectionKey = 'pinned' | 'today' | 'yesterday' | 'prev7' | 'prev30' | 'older';

function sectionLabel(key: SectionKey) {
  switch (key) {
    case 'pinned':
      return 'ピン留め';
    case 'today':
      return '今日';
    case 'yesterday':
      return '昨日';
    case 'prev7':
      return '過去7日';
    case 'prev30':
      return '過去30日';
    case 'older':
      return '以前';
  }
}

function useHistoryList() {
  const [entries, setEntries] = useState<Entry[]>([]);

  const refresh = useCallback(() => {
    const api = window.wasedaAIHistory;
    if (api?.list) {
      // list() が lastOpenedAt で並ぶ実装ならそのまま使う
      setEntries(api.list());
    } else {
      // 念のためのフォールバック（lastOpenedAt降順）
      const raw = readHistoryRaw();
      raw.sort((a, b) => {
        const ta = a.lastOpenedAt || a.createdAt;
        const tb = b.lastOpenedAt || b.createdAt;
        return tb.localeCompare(ta);
      });
      setEntries(raw);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = () => refresh();
    window.addEventListener('storage', onStorage);
    // アプリ側がカスタムイベントを飛ばしてくれる場合も拾う
    const onCustom = () => refresh();
    window.addEventListener('wasedaai:updated', onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('wasedaai:updated', onCustom as EventListener);
    };
  }, [refresh]);

  return { entries, refresh };
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M7 5l6 5-6 5V5z" />
    </svg>
  );
}

function IconPin({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16 3l5 5-1.5 1.5-2.5-2.5-6.5 6.5v5l-2 2v-7l6.5-6.5-2.5-2.5L16 3z" />
    </svg>
  ) : (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M14 3l7 7-3 3-7-7 3-3z" />
      <path d="M2 22l8-8" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
    </svg>
  );
}

export default function HistorySidebar({
  currentId,
  onOpen,
  className = '',
}: {
  currentId?: string;
  onOpen?: (id: string) => void;
  className?: string;
}) {
  const { entries, refresh } = useHistoryList();
  const [pins, setPins] = useState<Record<string, boolean>>(() => loadPins());
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => loadCollapsed());
  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const nowISO = useMemo(() => new Date().toISOString(), []);
  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f
      ? entries.filter((e) => e.title.toLowerCase().includes(f))
      : entries;
  }, [entries, filter]);

  const grouped = useMemo(() => {
    const groups: Record<SectionKey, Entry[]> = {
      pinned: [],
      today: [],
      yesterday: [],
      prev7: [],
      prev30: [],
      older: [],
    };
    for (const e of filtered) {
      if (pins[e.id]) {
        groups.pinned.push(e);
        continue;
      }
      const base = e.lastOpenedAt || e.createdAt;
      const d = daysDiff(base, nowISO); // 0=今日,1=昨日
      if (d === 0) groups.today.push(e);
      else if (d === 1) groups.yesterday.push(e);
      else if (d <= 7) groups.prev7.push(e);
      else if (d <= 30) groups.prev30.push(e);
      else groups.older.push(e);
    }
    return groups;
  }, [filtered, pins, nowISO]);

  const togglePin = useCallback((id: string) => {
    setPins((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      savePins(next);
      return next;
    });
  }, []);

  const toggleSection = useCallback((key: SectionKey) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveCollapsed(next);
      return next;
    });
  }, []);

  const handleOpen = useCallback(
    (id: string) => {
      if (onOpen) {
        onOpen(id);
      } else {
        // 既存の履歴ページがある前提のデフォルト遷移
        window.location.href = `/history/${id}`;
      }
    },
    [onOpen]
  );

  const handleDelete = useCallback((id: string) => {
    if (!window.confirm('このチャットを削除しますか？')) return;
    window.wasedaAIHistory?.remove(id);
    // ピンも消す
    setPins((prev) => {
      const next = { ...prev };
      delete next[id];
      savePins(next);
      return next;
    });
    refresh();
  }, [refresh]);

  const beginEdit = useCallback((e: Entry) => {
    setEditingId(e.id);
    setEditingText(e.title);
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingId) return;
    renameEntry(editingId, editingText);
    setEditingId(null);
    setEditingText('');
    refresh();
  }, [editingId, editingText, refresh]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingText('');
  }, []);

  const Section = ({ skey, items }: { skey: SectionKey; items: Entry[] }) => {
    if (skey !== 'pinned' && items.length === 0) return null;
    const isOpen = !collapsed[skey];
    return (
      <div className="mb-2">
        <button
          className="flex w-full items-center gap-2 px-2 py-1 text-xs font-semibold text-neutral-600 hover:text-neutral-800"
          onClick={() => toggleSection(skey)}
          aria-expanded={isOpen}
        >
          <IconChevron open={isOpen} />
          <span>{sectionLabel(skey)}</span>
        </button>
        {isOpen && (
          <ul className="mt-1 space-y-1 px-1">
            {items.map((e) => {
              const active = e.id === currentId;
              const isEdit = editingId === e.id;
              return (
                <li key={e.id} className="group relative">
                  <div
                    className={`flex items-center rounded-md px-2 py-1.5 text-sm ${active ? 'bg-neutral-200 text-neutral-900' : 'hover:bg-neutral-100'}`}
                  >
                    {isEdit ? (
                      <div className="flex w-full items-center gap-2">
                        <input
                          autoFocus
                          value={editingText}
                          onChange={(ev) => setEditingText(ev.target.value)}
                          onKeyDown={(ev) => {
                            if (ev.key === 'Enter') commitEdit();
                            if (ev.key === 'Escape') cancelEdit();
                          }}
                          className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-neutral-400"
                        />
                        <button
                          onClick={commitEdit}
                          className="rounded px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-200"
                          aria-label="保存"
                        >
                          保存
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100"
                          aria-label="キャンセル"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleOpen(e.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          title={e.title}
                        >
                          <span className="block truncate">{e.title || '無題のチャット'}</span>
                        </button>
                        <div className="ml-2 hidden items-center gap-1 text-neutral-500 group-hover:flex">
                          <button
                            onClick={() => togglePin(e.id)}
                            className="rounded p-1 hover:bg-neutral-200"
                            title={pins[e.id] ? 'ピンを外す' : 'ピン留め'}
                            aria-label={pins[e.id] ? 'ピンを外す' : 'ピン留め'}
                          >
                            <IconPin filled={pins[e.id]} />
                          </button>
                          <button
                            onClick={() => beginEdit(e)}
                            className="rounded p-1 hover:bg-neutral-200"
                            title="名前を変更"
                            aria-label="名前を変更"
                          >
                            <IconEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(e.id)}
                            className="rounded p-1 hover:bg-neutral-200"
                            title="削除"
                            aria-label="削除"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  return (
    <aside className={`flex h-full w-64 flex-col border-r bg-white/95 backdrop-blur ${className}`}>
      {/* 上部：新規/検索 */}
      <div className="border-b p-2">
        <button
          onClick={() => (window.location.href = '/')}
          className="mb-2 w-full rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          ＋ 新しいチャット
        </button>
        <input
          type="search"
          placeholder="履歴を検索…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400"
        />
      </div>

      {/* 下部：リスト */}
      <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
        {/* ピン留めは空でも見出しを出す（ChatGPTっぽさ） */}
        <Section skey="pinned" items={grouped.pinned} />
        <Section skey="today" items={grouped.today} />
        <Section skey="yesterday" items={grouped.yesterday} />
        <Section skey="prev7" items={grouped.prev7} />
        <Section skey="prev30" items={grouped.prev30} />
        <Section skey="older" items={grouped.older} />
      </div>
    </aside>
  );
}
