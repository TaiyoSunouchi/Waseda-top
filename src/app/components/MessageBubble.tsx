"use client";
import { Message } from "../lib/types";

export default function MessageBubble({ m }: { m: Message }) {
  const isUser = m.role === "user";
  return (
    <div className={`my-4 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[85%] rounded-2xl px-4 py-3 border shadow-sm",
          isUser
            ? "bg-gray-100 text-blue-600 border-gray-200" // ユーザー：灰背景 青文字
            : "bg-white text-orange-600 border-gray-200", // AI：白背景 オレンジ文字
        ].join(" ")}
      >
        <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{m.content}</div>
      </div>
    </div>
  );
}
