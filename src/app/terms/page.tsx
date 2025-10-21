// 利用規約ページ。Chat を import しない（静的ページでOK）。

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl p-6 text-black">
      <h1 className="text-2xl font-bold mb-4">利用規約</h1>
      <section className="prose prose-neutral">
        <p>このページは WasedaAI の利用規約です。</p>
        <p>（以前の文面があればここに貼り戻してください）</p>
      </section>
    </main>
  );
}
