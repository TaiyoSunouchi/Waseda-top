// src/app/history/[id]/page.tsx
'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Entry = { id: string; title: string; createdAt: string; session: any };

export default function HistoryDetail({ params }: { params: Promise<{ id: string }> }) {
  // ★ Promise になった params を React.use() で unwrap
  const { id } = use(params);
  const router = useRouter();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const api = (globalThis as any).wasedaAIHistory;
    const e = api?.get?.(id) ?? null;
    setEntry(e);
  }, [id]);

  useEffect(() => {
    if (!entry || restored) return;

    try {
      localStorage.setItem('wasedaai_restore_id', entry.id);
      localStorage.setItem('wasedaai_current_session_id', entry.id);
      localStorage.setItem('wasedaai_open_session_id', entry.id);
      localStorage.setItem('wasedaai_restore_ping', String(Date.now()));
    } catch {}

    setRestored(true);

    const url = `/?session=${encodeURIComponent(entry.id)}#restore=${encodeURIComponent(entry.id)}`;
    router.replace(url);

    setTimeout(() => {
      if (window.location.pathname.startsWith('/history')) {
        window.location.href = url;
      }
    }, 150);
  }, [entry, restored, router]);

  const messages = useMemo(() => {
    const msgs = entry?.session?.messages;
    if (!Array.isArray(msgs)) return null;
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
      <p className="text-sm text-gray-600 mb-6">
        {new Date(entry.createdAt).toLocaleString()}
      </p>

      <div className="mb-4 rounded border p-3">
        <p className="text-sm">
          この履歴のチャットを復元してホームに移動しています…
          <br />
          自動で移動しない場合は
          {' '}
          <a
            href={`/?session=${encodeURIComponent(entry.id)}#restore=${encodeURIComponent(entry.id)}`}
            className="underline"
          >
            こちらをクリック
          </a>
          してください。
        </p>
      </div>

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
