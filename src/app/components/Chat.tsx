// src/app/components/Chat.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";

type Role = "user" | "assistant" | "system";
type Message = { id: string; role: Role; content: string };

type Citation = {
  name?: string;
  code?: string;
  time?: string;
  instructor?: string;
  source_url?: string;
};

type HistoryEntry = {
  id: string;
  title: string;
  messages: Message[];
};

function hasUserSpeech(msgs: Message[]) {
  return msgs.some((m) => m.role === "user" && m.content.trim().length > 0);
}

function makeTitle(msgs: Message[]) {
  const firstUser = msgs.find((m) => m.role === "user" && m.content.trim());
  return firstUser ? firstUser.content.split("\n")[0].slice(0, 30) : "WasedaAI チャット";
}

export default function Chat() {
  // 初回から歓迎メッセージを吹き出し表示
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: "WasedaAIへようこそ！履修相談ならお任せください" },
  ]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  // 参考資料（出典）を別枠で表示
  const [citations, setCitations] = useState<Citation[]>([]);

  // IME状態と直後ガード
  const [isComposing, setIsComposing] = useState(false);
  const lastCompositionEndAt = useRef(0);

  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sessionId = useMemo(() => crypto.randomUUID(), []);

  // ===== 履歴（HistoryBridge 経由のシンプル読み出し） =====
  const [histories, setHistories] = useState<HistoryEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // ▼ メニュー開閉
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // ▼ 修正：ページ外クリックで閉じるが、「三点メニュー領域(data-hist-menu)内」は閉じない
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t?.closest("[data-hist-menu]")) setOpenMenuId(null);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const reloadHistory = () => {
    try {
      const api = (globalThis as any).wasedaAIHistory;
      if (api?.list) {
        const list = api.list() as HistoryEntry[];
        setHistories(Array.isArray(list) ? list : []);
      }
    } catch {
      /* no-op */
    }
  };

  useEffect(() => {
    reloadHistory();
  }, []);

  // ▼▼▼ 初期表示（歓迎のみ）では自動スクロールしない ▼▼▼
  useEffect(() => {
    if (messages.length <= 1) return;
    const el = listRef.current;
    if (!el) return;
    const t = setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 50);
    return () => clearTimeout(t);
  }, [messages.length]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = Math.min(160, Math.max(48, ta.scrollHeight)) + "px";
  }, [text]);

  useEffect(() => {
    if (!hasUserSpeech(messages)) return;
    try {
      (globalThis as any).wasedaAIHistory?.save({
        id: sessionId,
        title: makeTitle(messages),
        messages,
      });
      reloadHistory();
    } catch {
      /* no-op */
    }
  }, [messages, sessionId]);

  async function askRAG(query: string): Promise<{ answer: string; citations: Citation[] }> {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const j = await res.json();
        if (j?.error) msg = j.error;
      } catch {}
      throw new Error(msg);
    }
    return res.json();
  }

  const send = async () => {
    const q = text.trim();
    if (!q || loading) return;

    setText("");
    setLoading(true);
    setCitations([]);

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: q };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const { answer, citations } = await askRAG(q);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: answer || "（回答が空でした）" }]);
      setCitations(citations || []);
    } catch (e: any) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `エラー: ${e?.message || "ネットワークエラー"}` }]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return;
    if (e.shiftKey) return;
    // @ts-ignore
    if ((e.nativeEvent as any).isComposing || isComposing) return;
    const justEnded = Date.now() - lastCompositionEndAt.current < 80;
    if (justEnded) { e.preventDefault(); return; }
    e.preventDefault();
    void send();
  };

  const onCompositionStart = () => setIsComposing(true);
  const onCompositionEnd = () => { setIsComposing(false); lastCompositionEndAt.current = Date.now(); };

  const openHistory = (h: HistoryEntry) => {
    setSelectedHistoryId(h.id);
    setCitations([]);
    try {
      const api = (globalThis as any).wasedaAIHistory;
      const full = api?.get ? api.get(h.id) : null;
      const msgs: Message[] = (full?.session?.messages as Message[] | undefined) ?? (h.messages ?? []);
      setMessages(msgs.length ? msgs : []);
    } catch {
      setMessages(h.messages ?? []);
    }
    setTimeout(() => {
      textareaRef.current?.focus();
      const el = listRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 0);
  };

  // ▼ 削除（確認なしで即削除）
  const deleteHistory = (id: string) => {
    try {
      const api = (globalThis as any).wasedaAIHistory;
      if (api?.remove) {
        api.remove(id);
        setOpenMenuId(null);
        if (selectedHistoryId === id) setSelectedHistoryId(null);
        reloadHistory();
      } else {
        console.warn("wasedaAIHistory.remove が未実装です。");
      }
    } catch (e) {
      console.warn("履歴削除に失敗:", e);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] h-[100dvh] overflow-hidden px-3 py-3 pt-10  xl:grid xl:grid-cols-[20%_80%] xl:gap-4">
      {/* ===== 左サイド ===== */}
      <aside className="hidden xl:flex xl:flex-col">
        <div className="sticky top-3 rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-black">メニュー</h2>
          <nav className="grid gap-2 text-sm text-black">
            <a href="/" className="rounded-md px-3 py-2 hover:bg-gray-100 text-black">ホーム</a>
            <a href="/terms" className="rounded-md px-3 py-2 hover:bg-gray-100 text-black">利用規約</a>
            <a href="/privacy" className="rounded-md px-3 py-2 hover:bg-gray-100 text-black">プライバシー</a>
            <a href="/about" className="rounded-md px-3 py-2 hover:bg-gray-100 text-black">WasedaAI について</a>
          </nav>
        </div>

        <div className="mt-4 sticky top-[11rem] max-h-[calc(100dvh-12rem)] overflow-y-auto rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-black">履歴</h2>
          {histories.length === 0 ? (
            <p className="text-sm text-black">まだ履歴はありません</p>
          ) : (
            <ul className="space-y-2 text-black">
              {histories.map((h) => (
                <li key={h.id} className="relative">
                  {/* ▼ data-hist-menu を付けて、この領域内クリックでは閉じない */}
                  <div
                    data-hist-menu
                    className={`group flex items-center gap-2 rounded-lg border px-2 py-2 hover:bg-gray-50 ${
                      selectedHistoryId === h.id ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200"
                    }`}
                  >
                    <button
                      onClick={() => openHistory(h)}
                      className="flex-1 text-left text-sm min-w-0"
                      title={h.title}
                    >
                      <span className="line-clamp-1">{h.title || "(無題)"}</span>
                    </button>

                    {/* …ボタン */}
                    <button
                      type="button"
                      className="shrink-0 rounded-md px-2 py-1 text-gray-500 hover:bg-gray-200 relative z-10"
                      aria-label="メニュー"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setOpenMenuId((prev) => (prev === h.id ? null : h.id));
                      }}
                    >
                      <span className="text-lg leading-none">⋯</span>
                    </button>

                    {/* メニュー（灰色バブル・赤字・小さめ） */}
                    {openMenuId === h.id && (
                      <div
                        data-hist-menu
                        className="absolute right-0 top-[calc(100%+4px)] z-20 w-auto rounded-xl border border-gray-300 bg-gray-100 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                       <button
                         type="button"
                         className="px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-xl"
                         onClick={() => deleteHistory(h.id)}
                       >
                          消去する
                       </button>
                      </div>
                    )}

                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div className="flex min-h-[calc(100dvh-1.5rem)] flex-col rounded-2xl border bg-white">
        <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 pt-10 space-y-3 pb-[120px]">
          {messages.map((m) => {
            const isUser = m.role === "user";
            const isAssistant = m.role === "assistant";
            const alignCls = isUser ? "justify-end" : "justify-start";
            const bubbleBg = isUser ? "bg-blue-200" : isAssistant ? "bg-orange-200" : "bg-gray-200";
            return (
              <div key={m.id} className={`w-full flex ${alignCls}`}>
                <div className={`max-w-[min(80%,900px)] whitespace-pre-wrap rounded-2xl ${bubbleBg} text-black px-4 py-3 shadow-sm`}>
                  {m.content}
                </div>
              </div>
            );
          })}

          {citations.length > 0 && (
            <div className="mt-1 text-sm text-gray-700">
              {citations.length === 1 ? (
                <>
                  出典:{" "}
                  <a className="underline" href={citations[0].source_url || "#"} target="_blank" rel="noreferrer">
                    {citations[0].name || citations[0].source_url || "(出典URLなし)"}
                  </a>
                </>
              ) : (
                <>
                  出典:
                  <ul className="list-disc pl-5 space-y-1">
                    {citations.map((c, i) => (
                      <li key={i}>
                        <a className="underline" href={c.source_url || "#"} target="_blank" rel="noreferrer">
                          {c.name || c.source_url || "(出典URLなし)"}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>

        <div className={"sticky bottom-0 border-t bg-white/95 backdrop-blur px-3 pt-2 pb-3 pl-12 safe-bottom"}>
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              className="flex-1 resize-none rounded-xl border border-blue-300 px-4 pr-24 py-3 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              onCompositionStart={onCompositionStart}
              onCompositionEnd={onCompositionEnd}
              placeholder="例：春学期で英語で開講される2単位の科目を教えて"
              rows={2}
            />
            <button
              onClick={send}
              disabled={loading || !text.trim()}
              aria-label="送信"
              aria-busy={loading}
              className={`min-h-[44px] min-w-[44px] rounded-xl px-5 py-3 text-white shadow-sm ${
                loading || !text.trim() ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
              }`}
              title="送信（Enter ／ 改行は Shift+Enter）"
            >
              {loading ? "送信中..." : "送信"}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-gray-500 text-center">
            WasedaAIの回答は必ずしも正しいとは限りません。重要な情報は確認するようにしてください。
          </p>
        </div>
      </div>
    </div>
  );
}
