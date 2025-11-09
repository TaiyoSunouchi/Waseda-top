// src/app/components/BottomLeftHistory.tsx
'use client';

import HistorySidebar from './HistorySidebar';

/**
 * 既存の「左下の履歴欄」コンテナの中身だけを
 * ChatGPT風サイドバーに差し替えるコンポーネント。
 *
 * ⚠ 位置・サイズは親要素（あなたの既存コンテナ）に依存します。
 *    そのまま <BottomLeftHistory /> を既存の左下ボックス内に入れてください。
 */
export default function BottomLeftHistory() {
  // 中身はサイドバー本体のみ。サイズは親の h/ w をそのまま使う。
  return <HistorySidebar className="h-full" />;
}
