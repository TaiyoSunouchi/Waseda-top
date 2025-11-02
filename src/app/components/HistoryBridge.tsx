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

// 先頭のユーザー発話を取り出すヘルパー
function firstUserText(session: Session): string | null {
  if (!Array.isArray(session.messages)) return null;
  const first = session.messages.find(
    (m) => m.role === 'user' && typeof m.content === 'string'
  );
  return first ? (first.content as string).trim() : null;
}

export default function HistoryBridge() {
  useEffect(() => {
    const api = {
      list: () =>
        (loadAll() as Array<{ id: string; title: string; createdAt: string; session: Session }>)
          .filter((e) => hasUserSpeech(e.session)),

      get: (id: string) => {
        const entry = (loadAll() as any[]).find((e) => e.id === id) || null;
        return entry && hasUserSpeech(entry.session) ? entry : null;
      },

      save: (session: Session) => {
        const entries = loadAll();

        // ① ユーザーが一言も話してないなら保存しない（今までどおり）
        if (!hasUserSpeech(session)) {
          const cleaned = entries.filter((e: any) => e.id !== session.id);
          saveAll(cleaned);
          return null;
        }

        // ② 先頭ユーザー発話を基準に「同じチャット」を探す
        const firstText = firstUserText(session);
        const sameIdx =
          firstText != null
            ? entries.findIndex((e: any) => firstUserText(e.session) === firstText)
            : -1;

        // ③ ID を決める：既存があればそれを使う
        const id =
          session.id ||
          (sameIdx >= 0 ? entries[sameIdx].id : crypto.randomUUID());

        const createdAt =
          entries.find((e: any) => e.id === id)?.createdAt ||
          new Date().toISOString();

        const title =
            session.title ||
            (firstText ? firstText.slice(0, 30) : 'WasedaAI チャット');

        const entry = { id, title, createdAt, session };

        // ④ 既存を消してから先頭に入れる
        const others = entries.filter((e: any) => e.id !== id);
        saveAll([entry, ...others]);

        return id;
      },

      remove: (id: string) => {
        const entries = loadAll().filter((e: any) => e.id !== id);
        saveAll(entries);
      },

      clear: () => localStorage.removeItem(KEY),

      prune: () => {
        const all = loadAll();
        const pruned = all.filter((e: any) => hasUserSpeech(e.session));
        if (pruned.length !== all.length) saveAll(pruned);
        return pruned.length;
      },
    };

    (globalThis as any).wasedaAIHistory = api;
    api.prune();
  }, []);

  return null;
}
