// src/app/components/PasswordGate.tsx
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "wasedaai_pass_ok";

// ここに公開したいパスワードを並べる（あとで増やしてOK）
const ALLOWED_PASSWORDS = ["wasedaai", "test1234"];

type PasswordGateProps = {
  children: React.ReactNode;
};

export default function PasswordGate({ children }: PasswordGateProps) {
  const [ok, setOk] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hit = ALLOWED_PASSWORDS.some((p) => p === input.trim());
    if (hit) {
      
      setOk(true);
      setError("");
    } else {
      setError("パスワードが違います");
    }
  };

  if (ok) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-6 space-y-4">
        <h1 className="text-lg font-semibold text-center text-black">WasedaAI (限定公開中)</h1>
        <p className="text-sm text-gray-900 text-center">
          招待された人だけアクセスできます。パスワードを入力してください。
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full rounded-lg border text-black px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="パスワード"
            autoFocus
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 font-medium"
          >
            入室する
          </button>
        </form>
        
      </div>
    </div>
  );
}
