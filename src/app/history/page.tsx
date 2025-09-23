// src/app/history/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Entry = { id: string; title: string; createdAt: string; session: any };

function getFirstUserLine(session: any): string {
  const msgs = session?.messages;
  if (Array.isArray(msgs)) {
    const firstUser = msgs.find(
      (m) => m && m.role === 'user' && typeof m.content === 'string' && m.content.trim()
    );
    if (firstUser) {
      // 改行や連続空白をスペース1個にまとめ、1行＆120文字まで
      return firstUser.content.replace(/\s+/g, ' ').trim().slice(0, 120);
    }
  }
  return '（まだユーザーの発話がありません）';
}

export default function HistoryPage() {
  const [items, setItems] = useState<Entry[]>([]);

  const reload = () => {
    const api = (globalThis as any).wasedaAIHistory;
    setItems(api?.list?.() ?? []);
  };

  useEffect(() => {
    reload();
  }, []);

  const onRemove = (id: string) => {
    const api = (globalThis as any).wasedaAIHistory;
    api?.remove?.(id);
    reload();
  };

  const onClear = () => {
    if (!confirm('本当に全ての履歴を削除しますか？')) return;
    const api = (globalThis as any).wasedaAIHistory;
    api?.clear?.();
    reload();
  };

  return (
    <main className="mx-auto max-w-3xl p-6 text-black">
      <div className="flex items-center mb-4">
        <h1 className="text-2xl font-bold">チャット履歴</h1>
        <button
          onClick={onClear}
          className="ml-auto text-sm px-3 py-2 rounded border hover:bg-black/5"
        >
          すべて削除
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-700">まだ履歴がありません。</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="border rounded p-3 hover:bg-black/5">
              <div className="flex items-center gap-2">
                <Link href={`/history/${it.id}`} className="font-medium underline">
                  {it.title || '無題'}
                </Link>
                <span className="text-xs text-gray-500">
                  {new Date(it.createdAt).toLocaleString()}
                </span>
                <button
                  onClick={() => onRemove(it.id)}
                  className="ml-auto text-sm px-2 py-1 rounded hover:bg-black/10"
                  aria-label="この履歴を削除"
                >
                  削除
                </button>
              </div>

              {/* ▼ 一覧のプレビューは「最初のユーザーの一言」を1行で表示（ようこそメッセージ等は出しません） */}
              <div className="text-sm text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis">
                {getFirstUserLine(it.session)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
