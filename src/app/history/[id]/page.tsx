// src/app/history/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Entry = { id: string; title: string; createdAt: string; session: any };

export default function HistoryDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const [entry, setEntry] = useState<Entry | null>(null);

  useEffect(() => {
    const api = (globalThis as any).wasedaAIHistory;
    const e = api?.get?.(id) ?? null;
    setEntry(e);
  }, [id]);

  const messages = useMemo(() => {
    const msgs = entry?.session?.messages;
    if (!Array.isArray(msgs)) return null;
    // 「ようこそメッセージ」を除外（idがsys1 かつ assistant）
    return msgs.filter((m) => !(m?.id === 'sys1' && m?.role === 'assistant'));
  }, [entry]);

  if (!entry) {
    return (
      <main className="mx-auto max-w-3xl p-6 text-black">
        <p>該当する履歴が見つかりませんでした。</p>
        <p className="mt-2">
          <Link href="/history" className="underline">← 履歴一覧に戻る</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 text-black">
      <h1 className="text-2xl font-bold mb-2">{entry.title || '無題'}</h1>
      <p className="text-sm text-gray-600 mb-6">{new Date(entry.createdAt).toLocaleString()}</p>

      {Array.isArray(messages) ? (
        messages.length === 0 ? (
          <p className="text-gray-700">表示できるメッセージがありません。</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m: any, i: number) => (
              <li key={i} className="border rounded p-3">
                <div className="text-xs text-gray-500 mb-1">
                  {m.role ? `role: ${m.role}` : `item ${i + 1}`}
                </div>
                <div className="whitespace-pre-wrap break-words">
                  {typeof m.content === 'string'
                    ? m.content
                    : JSON.stringify(m.content, null, 2)}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : (
        <pre className="text-sm border rounded p-3 overflow-auto">
{JSON.stringify(entry.session, null, 2)}
        </pre>
      )}

      <p className="mt-6">
        <Link href="/history" className="underline">← 履歴一覧に戻る</Link>
      </p>
    </main>
  );
}
