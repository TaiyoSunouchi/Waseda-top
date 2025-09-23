// src/app/layout.tsx
import "./globals.css";
import { use } from "react";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import Topbar from "./components/Topbar";
import HistoryBridge from "./components/HistoryBridge";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "WasedaAI",
  description: "履修相談アシスタント",
  manifest: "/manifest.webmanifest",
  themeColor: "#111827",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WasedaAI",
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  // 動的ルートが増えても耐えるように広めの型にしています
  params: Promise<Record<string, string | string[]>>;
}) {
  // Next.js 15.5 では params は Promise なので unwrap（ここでは未使用でもOK）
  const _params = use(params);

  return (
    <html lang="ja" className="h-full">
      <body className="m-0 min-h-[100dvh] bg-white text-black antialiased">
        {/* 履歴APIをグローバル提供 */}
        <HistoryBridge />
        {/* 固定ヘッダー */}
        <Topbar />
        {/* 本文（ヘッダーぶん下げる：h-14 = 3.5rem） */}
        <div className="pt-14">{children}</div>
      </body>
    </html>
  );
}

