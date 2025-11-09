// src/app/components/HistoryBridge.tsx
'use client';

import { useEffect } from 'react';

// === Types ===
type Message = { role?: string; content?: any };
type Session = {
  id?: string;
  title?: string;
  messages?: Message[];
};

type Entry = {
  id: string;
  title: string;
  createdAt: string;
  lastOpenedAt?: string;
  session: Session;
};

// === LocalStorage Keys ===
const KEY = 'wasedaai_history_v1';

// === Helpers: storage ===
function loadAll(): Entry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(entries: Entry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries));
  // 同一タブ内でもリストを更新させるためのカスタムイベント
  window.dispatchEvent(new Event('wasedaai:updated'));
}

// === Helpers: text extraction & checks ===
/** 文字列・配列・オブジェクト（{text: "..."}）から素のテキストを抽出 */
function toPlainText(content: any): string | null {
  if (typeof content === 'string') {
    const t = content.trim();
    return t.length ? t : null;
  }
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    if (typeof content.text === 'string' && content.text.trim()) {
      return content.text.trim();
    }
    // 念のため content.content?.[0]?.text のような入れ子も探す
    const nested = (content as any).content;
    if (Array.isArray(nested)) {
      for (const piece of nested) {
        const t = toPlainText(piece);
        if (t) return t;
      }
    }
  }
  if (Array.isArray(content)) {
    for (const piece of content) {
      const t = toPlainText(piece);
      if (t) return t;
    }
  }
  return null;
}

function hasUserSpeech(session: Session): boolean {
  const msgs = session?.messages;
  if (!Array.isArray(msgs)) return false;
  return msgs.some((m) => m && m.role === 'user' && toPlainText(m.content));
}

/** 先頭のユーザー発話テキスト（配列/オブジェクト対応） */
function firstUserText(session: Session): string | null {
  const msgs = session?.messages;
  if (!Array.isArray(msgs)) return null;
  for (const m of msgs) {
    if (m && m.role === 'user') {
      const t = toPlainText(m.content);
      if (t) return t;
    }
  }
  return null;
}

// === Component ===
export default function HistoryBridge() {
  useEffect(() => {
    const api = {
      /** 履歴一覧（最後に開いた順で降順） */
      list: (): Entry[] => {
        return loadAll()
          .filter((e) => hasUserSpeech(e.session))
          .sort((a, b) => {
            const ta = a.lastOpenedAt || a.createdAt;
            const tb = b.lastOpenedAt || b.createdAt;
            return tb.localeCompare(ta); // 新しいほうが上
          });
      },

      /** 単一取得（ユーザー発話のあるもののみ） */
      get: (id: string): Entry | null => {
        const entry = loadAll().find((e) => e.id === id) || null;
        return entry && hasUserSpeech(entry.session) ? entry : null;
      },

      /**
       * 履歴保存/更新：
       * - ユーザー発話が無ければ削除扱い
       * - 既存と重複（同ID/同FirstUserText/同タイトル）は1件に統合
       * - lastOpenedAt を今に更新して先頭へ
       * - 既にリネームされたタイトルは維持（old.title を最優先）
       */
      save: (session: Session): string | null => {
        const entries = loadAll();

        // 1) ユーザー発話なし → 既存の一時IDがあれば削除して終了
        if (!hasUserSpeech(session)) {
          const cleaned = entries.filter((e) => e.id !== session.id);
          if (cleaned.length !== entries.length) {
            saveAll(cleaned);
          }
          return null;
        }

        const mineFirst = firstUserText(session);
        const mineTitleFromContent = mineFirst ? mineFirst.slice(0, 30) : null;
        const mineTitle = session.title || mineTitleFromContent;

        // 2) 既存重複候補を探す（優先順：ID → 先頭発話 → タイトル）
        const sameById = session.id
          ? entries.find((e) => e.id === session.id) || null
          : null;

        const sameByFirst =
          !sameById && mineFirst != null
            ? entries.find((e) => firstUserText(e.session) === mineFirst) || null
            : null;

        const sameByTitle =
          !sameById && !sameByFirst && mineTitle
            ? entries.find((e) => e.title === mineTitle) || null
            : null;

        const id =
          session.id ||
          sameById?.id ||
          sameByFirst?.id ||
          sameByTitle?.id ||
          crypto.randomUUID();

        // 3) 既存のメタを引き継ぎ
        const now = new Date().toISOString();
        const old = entries.find((e) => e.id === id) || sameById || sameByFirst || sameByTitle || null;

        const createdAt = old?.createdAt || now;

        // ★ リネーム保持：既存タイトルがあればそれを最優先（上書きしない）
        const title = old?.title || mineTitle || 'WasedaAI チャット';

        // 4) 新しいエントリを組み立て（lastOpenedAt を更新）
        const entry: Entry = {
          id,
          title,
          createdAt,
          lastOpenedAt: now,
          session,
        };

        // 5) 重複を除去（同ID/同先頭発話/同タイトル）
        const others = entries.filter((e) => {
          if (e.id === id) return false;
          const eFirst = firstUserText(e.session);
          if (mineFirst && eFirst === mineFirst) return false;
          if (mineTitle && e.title === mineTitle) return false;
          return true;
        });

        // 6) 先頭に新エントリを置いて保存（＝最後に開いた順で上に来る）
        saveAll([entry, ...others]);
        return id;
      },

      /** 削除 */
      remove: (id: string) => {
        const entries = loadAll().filter((e) => e.id !== id);
        saveAll(entries);
      },

      /** 全消去 */
      clear: () => {
        localStorage.removeItem(KEY);
        window.dispatchEvent(new Event('wasedaai:updated'));
      },

      /** 壊れた/空の履歴を整理 */
      prune: (): number => {
        const all = loadAll();
        const pruned = all.filter((e) => hasUserSpeech(e.session));
        if (pruned.length !== all.length) saveAll(pruned);
        return pruned.length;
      },
    };

    (globalThis as any).wasedaAIHistory = api;
    api.prune();
  }, []);

  return null;
}
