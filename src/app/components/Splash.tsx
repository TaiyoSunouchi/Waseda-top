// src/app/components/Splash.tsx
'use client';

import { useEffect, useState } from 'react';

type Props = { duration?: number };

export default function Splash({ duration = 1200 }: Props) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHidden(true), duration);
    return () => clearTimeout(t);
  }, [duration]);

  return (
    <div
      aria-hidden={hidden}
      className={`fixed inset-0 z-[9999] flex items-center justify-center
                  bg-white  /* ← 常に白。dark: は外しました */
                  transition-opacity duration-500
                  ${hidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ backgroundColor: '#ffffff' }} /* 念のための保険 */
    >
      <div className="flex flex-col items-center">
        <img
          src="/wasedaai-logo.png"  /* public/wasedaai-logo.png に置いた画像 */
          alt="WasedaAI"
          width={220}
          height={220}
          className="object-contain"
        />
        <p className="mt-4 text-sm text-gray-500 tracking-wider">WasedaAI</p>
      </div>
    </div>
  );
}
