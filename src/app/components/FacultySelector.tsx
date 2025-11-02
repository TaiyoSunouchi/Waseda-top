// src/app/components/FacultySelector.tsx
"use client";

import { useEffect, useRef, useState } from "react";

// 表示とIDをセットにする
const FACULTIES = [
  { id: "law", label: "法学部" },
  { id: "letters", label: "文学部" },
  { id: "commerce", label: "商学部" },
  { id: "education", label: "教育学部" },
  { id: "social", label: "社会科学部" },
  { id: "human_sci", label: "人間科学部" },
  { id: "poli", label: "政治経済学部" },
  { id: "fund_sci", label: "基幹理工学部" },
  { id: "creative_sci", label: "創造理工学部" },
  { id: "advanced_sci", label: "先進理工学部" },
  { id: "culture", label: "文化構想学部" },
  { id: "sil", label: "国際教養学部" },
  { id: "sport_sci", label: "スポーツ科学部" },
 
  
  
 
  
 
  
  
 
];

export default function FacultySelector({
  onSelect,
}: {
  onSelect?: (f: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function handleSelect(f: { id: string; label: string }) {
    setSelected(f);
    setOpen(false);
    // ← ここで保存しておくとホームに戻らなくても反映される
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedFaculty", f.id);
    }
    onSelect?.(f.id); // ← IDで渡す
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid #ccc",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        {selected ? selected.label : "学部を選択する"}
      </button>

      {open && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            right: 0,
            marginTop: 6,
            padding: 8,
            listStyle: "none",
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 6,
            boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
            maxHeight: 220,
            overflow: "auto",
            zIndex: 1000,
            minWidth: 180,
          }}
        >
          {FACULTIES.map((f) => (
            <li
              key={f.id}
              onClick={() => handleSelect(f)}
              role="option"
              aria-selected={selected?.id === f.id}
              style={{
                padding: "6px 8px",
                cursor: "pointer",
                borderRadius: 4,
                background: selected?.id === f.id ? "#f0f0f0" : "transparent",
              }}
            >
              {f.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
