'use client';

import { useEffect, useRef, useState } from 'react';

const FACULTIES = [
  '文学部',
  '文化構想学部',
  '教育学部',
  '法学部',
  '政治経済学部',
  '商学部',
  '社会科学部',
  '国際教養学部',
  '人間科学部',
  'スポーツ科学部',
  '基幹理工学部',
  '創造理工学部',
  '先進理工学部',
];

export default function FacultySelector({ onSelect }: { onSelect?: (f: string) => void }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function handleSelect(f: string) {
    setSelected(f);
    setOpen(false);
    onSelect?.(f);
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid #ccc',
          background: '#fff',
          cursor: 'pointer',
        }}
      >
        {selected ? selected : '学部を選択する'}
      </button>

      {open && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            right: 0,
            marginTop: 6,
            padding: 8,
            listStyle: 'none',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 6,
            boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
            maxHeight: 220,
            overflow: 'auto',
            zIndex: 1000,
            minWidth: 180,
          }}
        >
          {FACULTIES.map((f) => (
            <li
              key={f}
              onClick={() => handleSelect(f)}
              role="option"
              aria-selected={selected === f}
              style={{
                padding: '6px 8px',
                cursor: 'pointer',
                borderRadius: 4,
                background: selected === f ? '#f0f0f0' : 'transparent',
              }}
            >
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}