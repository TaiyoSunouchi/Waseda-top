'use client';

import Chat from "./components/Chat";
import FacultySelector from "./components/FacultySelector";

export default function Home() {
  return (
    <div style={{ padding: 20 }}>
      {/* ヘッダー内のボタン文字色を強制的に黒にするスタイルを追加 */}
      <style>{`
        header button {
          color: #000 !important;
        }
        /* ドロップダウン内の項目も黒にする（必要なら） */
        header [role="listbox"] li {
          color: #000 !important;
        }
      `}</style>

      <header
        style={{
          position: 'fixed',
          top: 12,
          left: 20,
          right: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 1000,
          /* 背景やパディング、影を無くして透明にする */
          background: 'transparent',
          padding: 0,
          borderRadius: 0,
          boxShadow: 'none',
        }}
      >
        {/* 右へオフセット：必要に応じて数値を調整してください */}
        <div style={{ marginLeft: '160px', display: 'flex', alignItems: 'center' }}>
          <FacultySelector onSelect={(f) => console.log('selected faculty:', f)} />
        </div>
      </header>

      {/* ここを小さくして上のバーとメインの余白を狭くします（以前は 72） */}
      <main style={{ paddingTop: 10}}>
        <Chat />
      </main>
    </div>
  );
}
