"use client";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

type Props = {
onSend: (text: string) => void;
placeholder?: string;
disabled?: boolean;
};

export default function MessageInput({ onSend, placeholder = "メッセージを入力", disabled }: Props) {
const [value, setValue] = useState("");
const [isComposing, setIsComposing] = useState(false);
const taRef = useRef<HTMLTextAreaElement | null>(null);

// textarea auto-resize
useEffect(() => {
const ta = taRef.current;
if (!ta) return;
ta.style.height = "auto";
ta.style.height = Math.min(ta.scrollHeight, 220) + "px"; // 最大高さ
}, [value]);

const send = () => {
const text = value.trim();
if (!text) return;
onSend(text);
setValue("");
};

return (
<div className="sticky bottom-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t border-gray-200 px-3 pt-2 pb-3 safe-bottom">
<div className="flex items-end gap-2">
<textarea
ref={taRef}
className="flex-1 resize-none rounded-2xl border border-gray-300 px-3 py-2 leading-6 focus:outline-none focus:ring-2 focus:ring-gray-300"
rows={1}
value={value}
onChange={(e) => setValue(e.target.value)}
placeholder={placeholder}
disabled={disabled}
onCompositionStart={() => setIsComposing(true)}
onCompositionEnd={() => setIsComposing(false)}
onKeyDown={(e) => {
// Enterで送信しない（IMEや改行を優先）。
// デスクトップで Ctrl/Cmd+Enter のみ送信OK。
if ((e.key === "Enter" && (e.ctrlKey || e.metaKey)) && !isComposing) {
e.preventDefault();
send();
}
}}
/>
<button
onClick={send}
disabled={disabled || !value.trim()}
className="shrink-0 inline-flex items-center justify-center rounded-2xl border border-gray-300 px-3 py-2 min-h-[44px] min-w-[44px] hover:bg-gray-50 disabled:opacity-50"
aria-label="送信"
>
<Send className="h-5 w-5" />
</button>
</div>
<p className="mt-1 text-[11px] text-gray-500">Ctrl/⌘+Enter で送信・Enter は改行</p>
</div>
);