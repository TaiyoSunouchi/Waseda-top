// src/lib/nameVariants.ts
export function normalizeBasic(s: string) {
  return (s || "")
    .normalize("NFKC")
    .replace(/\u200b/g, "")   // ゼロ幅
    .replace(/\u3000/g, " ")  // 全角スペース→半角
    .replace(/[\t\r\n]+/g, " ")
    .trim();
}

// 「ローリー ゲイ」→ ["ローリー ゲイ","ローリーゲイ","ローリー　ゲイ"]
export function expandNameVariants(name: string): string[] {
  const base = normalizeBasic(name).replace(/\s+/g, " "); // 余分な空白を1個に
  const noSpace = base.replace(/\s+/g, "");
  const fullWidth = base.replace(/\s+/g, "　");
  return Array.from(new Set([base, noSpace, fullWidth]));
}

// ユーザーのクエリ（"ローリーゲイ" など）も揺らぎ展開して検索語に足す
export function expandQueryTerms(terms: string[]): string[] {
  const out = new Set<string>();
  for (const t of terms) {
    const base = normalizeBasic(t);
    expandNameVariants(base).forEach(v => out.add(v));
  }
  return Array.from(out);
}
