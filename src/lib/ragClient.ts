export type RagOptions = {
  topk?: number;
  includeLaw?: boolean;
  year?: string; // 例: "2025秋"
};

export async function searchRag(query: string, options: RagOptions = {}) {
  const body = {
    q: query,
    topk: options.topk ?? 5,
    includeLaw: options.includeLaw ?? true,
    year: options.year ?? '2025秋',
  };

  const res = await fetch('/api/rag/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.text();
    throw new Error(`RAG search failed: ${e}`);
  }
  return res.json();
}