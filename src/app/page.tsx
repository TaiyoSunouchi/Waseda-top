// src/app/page.tsx
import Splash from "./components/Splash";
import Chat from "./components/Chat";

export default function Page() {
  return (
    <main className="min-h-dvh">
      <Splash />   {/* 起動時ロゴ → 自動フェードアウト */}
      <Chat />     {/* 既存のチャット画面 */}
    </main>
  );
}


