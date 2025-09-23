// src/app/components/Topbar.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Topbar() {
  const [open, setOpen] = useState(false);

  // Escキーでメニューを閉じる
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  return (
    <>
      {/* --- 固定ヘッダー（左端：三本線 → ロゴ → タイトル） --- */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-white/95 backdrop-blur text-black">
        <div className="w-full h-14 flex items-center">
          {/* 三本線：押すとメニューを開く */}
          <button
            onClick={() => setOpen(true)}
            className="h-14 w-14 flex items-center justify-center hover:bg-black/5 active:bg-black/10"
            aria-label="メニューを開く"
          >
            <svg width="24" height="24" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                 className="text-black" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>

          {/* ロゴ */}
          <img src="/wasedaai-logo.png" alt="WasedaAI logo" className="h-8 w-8 object-contain" />

          {/* タイトル */}
          <span className="ml-2 text-base font-semibold text-black">WasedaAI</span>
        </div>
      </header>

      {/* 背景オーバーレイ */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!open}
      />

      {/* 左サイドバー（メニュー本体） */}
      <nav
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white text-black border-r shadow-lg transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="サイドメニュー"
        aria-hidden={!open}
      >
        <div className="h-14 flex items-center px-4 border-b">
          <span className="font-semibold">メニュー</span>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto rounded p-1 hover:bg-black/5"
            aria-label="メニューを閉じる"
          >
            ✕
          </button>
        </div>

        <ul className="p-2">
          <li>
            <Link href="/" onClick={() => setOpen(false)} className="block px-3 py-2 rounded hover:bg-black/5 text-black">
              ホーム
            </Link>
          </li>
          <li>
            <Link href="/history" onClick={() => setOpen(false)} className="block px-3 py-2 rounded hover:bg-black/5 text-black">
              チャット履歴
            </Link>
          </li>
          <li>
            <Link href="/terms" onClick={() => setOpen(false)} className="block px-3 py-2 rounded hover:bg-black/5 text-black">
              利用規約
            </Link>
          </li>
          <li>
            <Link href="/privacy" onClick={() => setOpen(false)} className="block px-3 py-2 rounded hover:bg-black/5 text-black">
              プライバシーポリシー
            </Link>
          </li>
          <li>
            <Link href="/about" onClick={() => setOpen(false)} className="block px-3 py-2 rounded hover:bg-black/5 text-black">
              WasedaAI について
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
