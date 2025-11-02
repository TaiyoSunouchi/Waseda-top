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

// 先頭のユーザー発話を1本取り出す（これを「同じチャットかどうか」のキーにする）
function firstUserText(session: Session): string | null {
  const msgs = session?.messages;
  if (!Array.isArray(msgs)) return null;
  const first = msgs.find(
    (m) => m && m.role === 'user' && typeof m.content === 'string' && m.content.trim()
  );
  return first ? (first.content as string).trim() : null;
}

export default function HistoryBridge() {
  useEffect(() => {
    const api = {
      // 一覧に出すときは「ユーザーが一度でも話したやつだけ」
      list: () =>
        (loadAll() as Array<{ id: string; title: string; createdAt: string; session: Session }>)
          .filter((e) => hasUserSpeech(e.session)),

      get: (id: string) => {
        const entry = (loadAll() as any[]).find((e) => e.id === id) || null;
        return entry && hasUserSpeech(entry.session) ? entry : null;
      },

      // ★ここが肝心
      save: (session: Session) => {
        const entries = loadAll();

        // 1. そもそもユーザーがまだ話してなければ、保存しないで掃除だけ
        if (!hasUserSpeech(session)) {
          const cleaned = entries.filter((e: any) => e.id !== session.id);
          saveAll(cleaned);
          return null;
        }

        // 2. いま保存しようとしているチャットの「最初の一言」を基準に既存を探す
        const mineFirst = firstUserText(session);

        // 「同じ最初の一言」の履歴がすでにあるか？
        const sameIdx =
          mineFirst != null
            ? entries.findIndex((e: any) => firstUserText(e.session) === mineFirst)
            : -1;

        // 3. 使うIDを決める
        //    - session.id があればそれを使う
        //    - なければ、同じ最初の一言のものがあればそのIDを再利用
        //    - どちらもなければ新規に作る
        const id =
          session.id ||
          (sameIdx >= 0 ? entries[sameIdx].id : crypto.randomUUID());

        // 4. createdAt はあるなら引き継ぐ
        const createdAt =
          entries.find((e: any) => e.id === id)?.createdAt ||
          new Date().toISOString();

        // 5. タイトルは渡されてるか、なければ最初の一言の先頭30文字
        const title =
          session.title ||
          (mineFirst ? mineFirst.slice(0, 30) : 'WasedaAI チャット');

        const entry = { id, title, createdAt, session };

        // 6. 同じIDのもの、または同じ最初の一言のものは全部消してから入れ直す
        const others = entries.filter(
          (e: any) => e.id !== id && firstUserText(e.session) !== mineFirst
        );

        // 先頭に最新を積む
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
