// 極小 BM25 実装（依存なし）
// 参考: BM25 の基本式を簡略化した実用ミニ版

export type Doc = { id: string; text: string };

export class BM25 {
private docs: Doc[] = [];
private avgdl = 0;
private df: Map<string, number> = new Map();
private tf: Map<string, Map<string, number>> = new Map();

constructor(docs: Doc[]) {
this.docs = docs;
const lengths: number[] = [];

for (const d of docs) {
const terms = d.text.split(" ");
lengths.push(terms.length);
const tfMap = new Map<string, number>();
for (const t of terms) {
tfMap.set(t, (tfMap.get(t) || 0) + 1);
}
this.tf.set(d.id, tfMap);
for (const t of new Set(terms)) {
this.df.set(t, (this.df.get(t) || 0) + 1);
}
}

this.avgdl = lengths.reduce((a, b) => a + b, 0) / Math.max(1, lengths.length);
}

search(queryTerms: string[], k = 10): { id: string; score: number }[] {
const N = this.docs.length;
const k1 = 1.5;
const b = 0.75;

const scores: Map<string, number> = new Map();

for (const doc of this.docs) {
const tfMap = this.tf.get(doc.id)!;
const dl = doc.text.split(" ").length;
let score = 0;
for (const q of queryTerms) {
const f = tfMap.get(q) || 0;
if (!f) continue;
const n_q = this.df.get(q) || 0;
const idf = Math.log(1 + (N - n_q + 0.5) / (n_q + 0.5));
const denom = f + k1 * (1 - b + (b * dl) / this.avgdl);
score += idf * ((f * (k1 + 1)) / denom);
}
if (score > 0) scores.set(doc.id, score);
}

return Array.from(scores.entries())
.sort((a, b) => b[1] - a[1])
.slice(0, k)
.map(([id, score]) => ({ id, score }));
}
}