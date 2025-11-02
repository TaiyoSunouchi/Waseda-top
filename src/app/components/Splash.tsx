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
          alt="早稲田AI研究会"
          width={300}
          height={300}
          className="object-contain"
        />
        <p className="mt-20 text-2xl font-semibold text-gray-900 tracking-wider">早稲田AI研究会</p>
      </div>
    </div>
  );
}
