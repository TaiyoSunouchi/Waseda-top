// src/app/components/HistoryBridge.tsx
'use client';

import { useEffect } from 'react';

type Message = { role?: string; content?: unknown };
type Session = {
  id?: string;
  title?: string;
  messages?: Message[];
};

const KEY = 'wasedaai_history_v1';

function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(entries: any[]) {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

function hasUserSpeech(session: Session): boolean {
  const msgs = session?.messages;
  if (!Array.isArray(msgs)) return false;
  return msgs.some(
    (m) =>
      m &&
      m.role === 'user' &&
      typeof m.content === 'string' &&
      m.content.trim().length > 0
  );
}

export default function HistoryBridge() {
  useEffect(() => {
    const api = {
      /** 履歴一覧：ユーザー発話が無いものは出さない */
      list: () =>
        (loadAll() as Array<{ id: string; title: string; createdAt: string; session: Session }>)
          .filter((e) => hasUserSpeech(e.session)),

      /** idで詳細取得（ユーザー発話が無ければ null 扱い） */
      get: (id: string) => {
        const entry = (loadAll() as any[]).find((e) => e.id === id) || null;
        return entry && hasUserSpeech(entry.session) ? entry : null;
      },

      /** 保存：ユーザー発話が無ければ保存しない（既存があれば削除） */
      save: (session: Session) => {
        const id = session.id || crypto.randomUUID();
        const entries = loadAll();
        const others = entries.filter((e: any) => e.id !== id);

        if (!hasUserSpeech(session)) {
          // ユーザー未発話なら、残さない（既存も掃除）
          saveAll(others);
          return null;
        }

        const createdAt =
          entries.find((e: any) => e.id === id)?.createdAt ||
          new Date().toISOString();

        const title =
          session.title ||
          // タイトル未指定なら最初のユーザー発話から生成
          (Array.isArray(session.messages)
            ? (session.messages.find(
                (m) => m.role === 'user' && typeof m.content === 'string'
              )?.content as string)?.slice(0, 30) || 'WasedaAI チャット'
            : 'WasedaAI チャット');

        const entry = { id, title, createdAt, session };
        saveAll([entry, ...others]);
        return id;
      },

      /** 1件削除 */
      remove: (id: string) => {
        const entries = loadAll().filter((e: any) => e.id !== id);
        saveAll(entries);
      },

      /** 全削除 */
      clear: () => localStorage.removeItem(KEY),

      /** （任意）ユーザー未発話の履歴を一括削除 */
      prune: () => {
        const all = loadAll();
        const pruned = all.filter((e: any) => hasUserSpeech(e.session));
        if (pruned.length !== all.length) saveAll(pruned);
        return pruned.length;
      },
    };

    // グローバル公開
    (globalThis as any).wasedaAIHistory = api;

    // 起動時に一度だけ、未発話の履歴を整理
    api.prune();
  }, []);

  return null;
}
