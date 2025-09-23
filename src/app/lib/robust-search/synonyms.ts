export const SYNONYMS: Record<string, string[]> = {
"内容": ["概要", "授業内容", "授業説明", "講義内容", "講義の要点", "シラバス", "到達目標", "学習目的"],
"概要": ["内容", "授業内容", "講義の説明", "授業紹介", "要点"],
"法曹演習": ["演習", "ゼミ", "実務演習", "ケーススタディ"],
"担当教員": ["教員", "先生", "講師", "インストラクター"],
"単位": ["単位数"],
"春学期": ["春", "S", "Spring"],
"英語": ["英語で開講", "English", "使用言語:英"],
};

export function expandWithSynonyms(query: string): string[] {
const terms = tokenizeJa(query);
const expanded = new Set<string>();
for (const t of terms) {
expanded.add(t);
const syns = SYNONYMS[t];
if (syns) syns.forEach((s) => expanded.add(s));
}
return Array.from(expanded);
}
export function tokenizeJa(text: string): string[] {
// 極めて単純な分割（記号除去→スペース分割）。本格形態素解析の代替。
return text
.toLowerCase()
.replace(/[\p{P}\p{S}]/gu, " ")
.replace(/[\s\u3000]+/g, " ")
.trim()
.split(" ")
.filter(Boolean);
}