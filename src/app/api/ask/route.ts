// src/app/api/ask/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { parse as parseCSV } from "csv-parse/sync";

/* ========== データセット定義（既存 data に加えて faculty_rules も見る） ========== */
const DATASETS = [
  { key: "syllabus",      rec: ["data", "records.json"],          emb: ["data", "embeddings.npz"] },
  { key: "faculty_rules", rec: ["data", "faculty_rules", "records.json"], emb: ["data", "faculty_rules", "embeddings.npz"] },
  // 既存配列に追加
  { key: "faculty_profiles_csv",
    rec: ["data","faculty_profiles_csv","records.json"],
    emb: ["data","faculty_profiles_csv","embeddings.npz"] },
];

// 追加: law_fall CSV の場所
const CSV_DIR =
  process.env.WASEDAAI_CSV_DIR ||
  path.join(process.cwd(), "..", "wasedaai-syllabus-pdf", "pdfs", "law_fall");

type Row = { [k: string]: any };

let recordsCache: Row[] | null = null;
let vectorsCache: Float32Array[] | null = null;
let vecDim: number | null = null;

/* =========================
   ★ 日本語簡易正規化/トークナイズ
   ========================= */
function normalizeJa(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/\u3000/g, " ")
    .replace(/[\p{P}\p{S}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function tokenizeJa(text: string): string[] {
  const t = normalizeJa(text);
  if (!t) return [];
  return t.split(" ").filter(Boolean);
}

/* =========================
   ★ 同義語の強化版（双方向化）＋自然文パターン対応
   ========================= */
const RAW_SYNONYMS: Record<string, string[]> = {
  /* ── 授業の内容系 ── */
  "概要": ["内容", "授業内容", "授業説明", "講義内容", "講義の要点", "シラバス", "イントロ", "要点", "要約", "サマリー", "特徴", "特色", "趣旨"],
  "特徴": ["概要", "内容", "特色", "ポイント", "性質", "他科目との差", "強み"],
  "目的": ["狙い", "ねらい", "ゴール", "意図", "趣旨", "学習目的", "学習目標"],
  "到達目標": ["ゴール", "目標", "学習目標", "学習到達目標", "目的", "アウトカム", "学修成果"],
  "授業計画": ["進め方", "スケジュール", "予定", "プログラム", "講義計画", "週間計画", "シラバス週次", "タイムライン"],
  "キーワード": ["keywords", "テーマ", "トピック", "扱うテーマ", "主題"],

  /* ── 授業形式・方法 ── */
  "授業方法": ["スタイル", "講義形式", "指導方法", "進め方", "授業形態", "実施形態", "対面", "オンライン", "オンデマンド", "同時双方向", "ハイブリッド", "ハイフレックス", "遠隔", "zoom", "teams"],
  "授業形態": ["授業方法", "実施形態", "対面", "オンライン", "オンデマンド", "同時双方向", "ハイブリッド", "ハイフレックス"],
  "授業外学習": ["予習", "復習", "自習", "学習時間", "独習", "課外学習", "学修時間"],

  /* ── 成績評価・課題 ── */
  "成績評価方法": ["成績評価", "評価方法", "採点基準", "評価基準", "評価比率", "配点", "割合", "グレーディング", "grading"],
  "評価比率": ["割合", "配点", "%", "比率", "ウェイト"],
  "試験": ["テスト", "筆記", "口頭試験", "期末試験", "中間試験", "小テスト", "クイズ", "持ち込み可", "オープンブック", "追試"],
  "レポート": ["最終レポート", "課題", "宿題", "エッセイ", "essay", "提出物", "アサインメント", "assignment"],
  "課題": ["宿題", "レポート", "ワーク", "提出物", "アサインメント", "小課題"],
  "提出": ["締切", "期限", "提出方法", "提出形態", "提出先", "アップロード", "提出場所"],
  "出席": ["出欠", "出席点", "attendance", "欠席", "遅刻", "公欠"],

  /* ── 教材・LMS ── */
  "教科書": ["テキスト", "使用書籍", "指定書", "メイン教材"],
  "参考文献": ["リーディング", "参考資料", "関連文献", "参考図書", "reading list"],
  "配布資料": ["スライド", "PDF", "講義資料", "資料配布", "資料"],
  "授業サイト": ["LMS", "学習支援システム", "Moodle", "Waseda Moodle", "Course N@vi", "MyWaseda", "Classroom", "Google Classroom"],

  /* ── 基本情報 ── */
  "科目名": ["授業名", "講義名", "クラス名", "授業タイトル", "科目タイトル", "タイトル"],
  "コード": ["科目コード", "授業コード", "科目番号", "講義コード", "コースコード"],
  "担当教員": ["教員", "先生", "講師", "インストラクター", "教授", "准教授", "助教"],
  "単位": ["単位数", "credit", "credits", "履修単位", "何単位"],
  "学期": ["学期曜日時限", "開講学期", "ターム", "春学期", "秋学期", "前期", "後期", "学期スケジュール"],
  "曜日": ["曜日時限", "開講曜日", "授業日", "開講日"],
  "時限": ["曜日時限", "時限数", "授業時間", "コマ", "時間帯"],
  "キャンパス": ["校舎", "場所", "開講場所"],
  "配当年次": ["対象学年", "対象年次", "学年", "受講対象"],
  "履修条件": ["受講条件", "登録条件", "前提科目", "先修条件", "要件", "prerequisite"],
  "定員": ["人数上限", "キャパ", "定員数", "募集人数"],
  "抽選": ["レジストレーション抽選", "抽選登録", "抽選制度"],
  "レベル": ["難易度", "初級", "中級", "上級"],

  /* ── 自然文のタグ ── */
  "どこ": ["キャンパス", "教室", "場所"],
  "いつ": ["学期", "曜日", "時限", "日程"],
  "誰": ["担当教員", "先生", "教員"],
  "どう評価": ["成績評価方法", "試験", "レポート"],
  "課題は": ["課題", "レポート", "提出"],
  "試験は": ["試験", "成績評価方法"],
  "言語は": ["使用言語", "開講言語"],
  "オンラインか": ["授業形態", "授業方法", "オンライン", "オンデマンド", "対面"],
};

function buildSymmetricSynonyms(groups: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, Set<string>> = {};
  const add = (a: string, b: string) => {
    const A = normalizeJa(a);
    const B = normalizeJa(b);
    if (!out[A]) out[A] = new Set<string>();
    if (A !== B) out[A].add(B);
  };
  for (const [, vs] of Object.entries(groups)) {
    const all = vs; // 双方向化は別で k も登録されるのでここは値同士の連結で十分
  }
  // 値も含め全結合（キー自身も含める）
  for (const [k, vs] of Object.entries(groups)) {
    const all = [k, ...vs];
    for (const a of all) for (const b of all) add(a, b);
  }
  const materialized: Record<string, string[]> = {};
  for (const [k, set] of Object.entries(out)) materialized[k] = Array.from(set);
  return materialized;
}
const SYNONYMS: Record<string, string[]> = buildSymmetricSynonyms(RAW_SYNONYMS);

const PATTERN_RULES: Array<[RegExp, string[]]> = [
  [/(何単位|単位は|単位数は)/, ["単位"]],
  [/(誰(が|の)?|どの先生|担当教員|先生は)/, ["担当教員"]],
  [/どこ(で|ですか)?/, ["キャンパス", "教室", "場所"]],
  [/(いつ|何曜日|何時限|時間帯|何コマ|日程|スケジュール)/, ["学期", "曜日", "時限", "日程"]],
  [/(どう.*評価|評価(は|方法|基準))/ , ["成績評価方法"]],
  [/(課題|宿題|レポート|提出|エッセイ)/, ["課題", "レポート", "提出"]],
  [/(試験|テスト|中間|期末|小テスト|クイズ)/, ["試験"]],
  [/(言語|英語|日本語|バイリンガル|bilingual)/i, ["使用言語"]],
  [/(オンライン|オンデマンド|対面|ハイブリッド|ハイフレックス|zoom|teams)/i, ["授業形態", "授業方法"]],
  [/(定員|人数上限|キャパ|抽選)/, ["定員", "抽選"]],
];

function expandWithSynonyms(query: string): string[] {
  const baseTokens = tokenizeJa(query);
  const out = new Set<string>(baseTokens);

  // ① 双方向同義語
  for (const t of baseTokens) {
    const syns = SYNONYMS[t];
    if (syns) syns.forEach(s => out.add(s));
  }

  // ② パターン（自然文 → タグ）
  const q = normalizeJa(query);
  for (const [re, tags] of PATTERN_RULES) {
    if (re.test(q)) tags.forEach(tag => out.add(normalizeJa(tag)));
  }

  return Array.from(out);
}

/* =========================
   ★ 文書→検索用フラットテキスト
   ========================= */
function buildRecordText(r: Row): string {
  const parts = [
    r.name, r.code, r.time, r.instructor, r.faculty, r.semester, r.category,
    r.language, r.day_period, r.campus, r.description, r.goals, r.keywords,
    r.grading, r.textbooks, r.notes, r.title, r.section, r.content, r.source_path,
  ].filter(Boolean);
  return normalizeJa(parts.join(" "));
}

/* =========================
   ★ 軽量BM25風スコア
   ========================= */
function lexicalScore(queryTerms: string[], docTokens: string[]): number {
  if (docTokens.length === 0 || queryTerms.length === 0) return 0;
  const tf = new Map<string, number>();
  const df = new Map<string, number>();
  const docSet = new Set(docTokens);
  for (const t of docTokens) tf.set(t, (tf.get(t) || 0) + 1);
  for (const t of docSet) df.set(t, (df.get(t) || 0) + 1);
  const N = 2;
  let score = 0;
  const dl = docTokens.length;
  const avgdl = 1000;
  const k1 = 1.2, b = 0.75;
  for (const q of queryTerms) {
    const f = tf.get(q) || 0;
    if (!f) continue;
    const n_q = df.get(q) || 0;
    const idf = Math.log(1 + (N - n_q + 0.5) / (n_q + 0.5));
    const denom = f + k1 * (1 - b + (b * dl) / avgdl);
    score += idf * ((f * (k1 + 1)) / denom);
  }
  return score;
}

/* =========================
   ★ 追加：空白無視のゆるい一致（姓名のスペース揺らぎ対策）
   ========================= */
function noSpace(s: string) {
  return normalizeJa(s).replace(/\s+/g, "");
}
function fuzzySpaceScore(queryTerms: string[], docText: string): number {
  const d = normalizeJa(docText);
  const dNo = d.replace(/\s+/g, "");
  let score = 0;
  for (const q of queryTerms) {
    const qNo = q.replace(/\s+/g, "");
    if (!qNo) continue;
    if (d.includes(q)) score += 0.5;
    else if (dNo.includes(qNo)) score += 1.0;
  }
  return score;
}

/* =========================
   ★ npz ローダ
   ========================= */
async function loadNPZVectors(buf: Buffer): Promise<{ vecs: Float32Array[]; dim: number }> {
  const zip = await JSZip.loadAsync(buf);
  const npyFile = zip.file("arr_0.npy");
  if (!npyFile) throw new Error("arr_0.npy not found in npz");
  const npyBuf = await npyFile.async("nodebuffer");

  if (npyBuf.readUInt8(0) !== 0x93 || npyBuf.toString("ascii", 1, 6) !== "NUMPY") {
    throw new Error("Invalid NPY magic");
  }
  const headerLen = npyBuf.readUInt16LE(8);
  const header = npyBuf.toString("ascii", 10, 10 + headerLen);
  const m = header.match(/'descr':\s*'<f4'.*'shape':\s*\((\d+),\s*(\d+)\)/);
  if (!m) throw new Error("Unsupported NPY header: " + header);
  const n = parseInt(m[1], 10);
  const d = parseInt(m[2], 10);
  const data = npyBuf.slice(10 + headerLen);
  const arr = new Float32Array(new Uint8Array(data).buffer);
  const out: Float32Array[] = new Array(n);
  for (let i = 0; i < n; i++) out[i] = arr.slice(i * d, (i + 1) * d);
  return { vecs: out, dim: d };
}
function normalize(v: Float32Array) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  const inv = 1 / (Math.sqrt(s) + 1e-10);
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] * inv;
  return out;
}
function cosine(a: Float32Array, b: Float32Array) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/* =========================
   ★ 複数データセットを読み込み
   ========================= */
async function ensureLoaded() {
  if (recordsCache && vectorsCache && vecDim) return;

  const allRecords: Row[] = [];
  const allVectors: Float32Array[] = [];
  let commonDim: number | null = null;

  for (const ds of DATASETS) {
    const recPath = path.join(process.cwd(), ...ds.rec);
    const embPath = path.join(process.cwd(), ...ds.emb);
    if (!fs.existsSync(recPath) || !fs.existsSync(embPath)) continue;

    const recs: Row[] = JSON.parse(fs.readFileSync(recPath, "utf-8"));
    const { vecs, dim } = await loadNPZVectors(fs.readFileSync(embPath));
    const normVecs = vecs.map(normalize);

    if (commonDim === null) {
      commonDim = dim;
      allRecords.push(...recs);
      allVectors.push(...normVecs);
    } else if (dim === commonDim) {
      allRecords.push(...recs);
      allVectors.push(...normVecs);
    } else {
      console.warn(`[RAG] skip dataset due to dim mismatch: got ${dim}, expected ${commonDim} (${recPath})`);
    }
  }

  if (!allRecords.length || !allVectors.length) {
    throw new Error("データが見つかりません");
  }

  recordsCache = allRecords;
  vectorsCache = allVectors;
  vecDim = allVectors[0].length;
}

/* =========================
   ★ CSV 読み込み + 簡易検索
   ========================= */
type CsvDoc = {
  title: string;
  body: string;
  meta: { instructor?: string; time?: string; source_url?: string; file_path: string };
};
let csvDocsCache: CsvDoc[] | null = null;

function loadCsvDocs(): CsvDoc[] {
  if (csvDocsCache) return csvDocsCache;
  const docs: CsvDoc[] = [];
  if (!fs.existsSync(CSV_DIR)) return (csvDocsCache = []);
  const files = fs.readdirSync(CSV_DIR).filter(f => f.endsWith(".csv"));
  for (const f of files) {
    try {
      const full = path.join(CSV_DIR, f);
      const rows = parseCSV(fs.readFileSync(full, "utf-8"), { columns: true }) as Row[];
      const row = rows[0] || {};
      const title = row["科目名"] || f;
      const parts = [
        row["授業概要"], row["授業計画"], row["成績評価方法"],
        row["担当教員"], row["学期曜日時限"]
      ].filter(Boolean);
      docs.push({
        title,
        body: parts.join(" / "),
        meta: {
          instructor: row["担当教員"],
          time: row["学期曜日時限"],
          source_url: row["出典URL"],
          file_path: full,
        },
      });
    } catch {}
  }
  csvDocsCache = docs;
  return docs;
}

// ★ 追加：CSV側にも空白無視一致の加点を導入
function scoreCsvDoc(query: string, doc: CsvDoc): number {
  const qTokens = new Set(tokenizeJa(query));
  const dTokens = new Set(tokenizeJa(doc.title + " " + doc.body));
  let overlap = 0;
  qTokens.forEach(t => { if (dTokens.has(t)) overlap++; });

  // 空白無視の追加スコア（姓名スペース揺らぎ）
  const docText = `${doc.title} ${doc.body} ${doc.meta.instructor || ""}`;
  const extra = fuzzySpaceScore(Array.from(qTokens), docText);

  return overlap + extra;
}

/* =========================
   ★ POST：既存＋CSVも統合（アバウト質問に強化）
   ========================= */
export async function POST(req: NextRequest) {
  try {
    await ensureLoaded();
    const body = await req.json();
    const userQuery: string = (body?.query ?? body?.question ?? "").trim();
    if (!userQuery) return NextResponse.json({ error: "query is required" }, { status: 400 });

    const expandedTerms = expandWithSynonyms(userQuery);

    // ★ アバウト質問対応：特定項目が含まれないときはデフォルト項目を追加
    const specificKeys = [
      "単位","成績評価方法","課題","試験","教科書","参考文献",
      "使用言語","曜日","時限","キャンパス","履修条件","定員","抽選","レベル"
    ];
    const hasSpecific = expandedTerms.some(t => specificKeys.includes(t));
    if (!hasSpecific) {
      ["概要", "授業計画", "成績評価方法"].forEach(term => expandedTerms.push(normalizeJa(term)));
    }

    // ===== 既存 RAG =====
    const embResp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: process.env.EMBED_MODEL || "text-embedding-3-small", input: [userQuery] }),
    }).then(r => r.json());

    const qEmb = embResp?.data?.[0]?.embedding as number[] | undefined;
    if (!qEmb) {
      return NextResponse.json({ error: "embedding failed" }, { status: 500 });
    }

    const qn = normalize(new Float32Array(qEmb));
    const sims = vectorsCache!.map(v => cosine(qn, v));
    const roughIdx = sims
      .map((s, i) => [s, i] as const)
      .sort((a, b) => b[0] - a[0])
      .slice(0, 20)
      .map(x => x[1]);

    const candidates = roughIdx.map(i => ({ row: recordsCache![i], vecSim: sims[i] }));

    const rescored = candidates
      .map(c => {
        const docText = buildRecordText(c.row);
        const lex = lexicalScore(expandedTerms, tokenizeJa(docText));
        const loose = fuzzySpaceScore(expandedTerms, docText);
        return { ...c, hybrid: c.vecSim + 0.6 * (lex + loose) };
      })
      .sort((a, b) => b.hybrid - a.hybrid);

    // ===== 名前一致ボーナス（人名・教員名のスペース揺らぎに強くする）=====
    function normalizeSimple(s: string) {
      return (s || "").replace(/\s+/g, "").toLowerCase();
    }
    function nameHitBonus(row: Row, query: string): number {
      const q = normalizeSimple(query);
      if (!q) return 0;
      const n = normalizeSimple(row.name || "");
      const inst = normalizeSimple(row.instructor || "");
      // クエリと name / instructor が互いに包含したらボーナス
      if (n && (q.includes(n) || n.includes(q))) return 0.10;
      if (inst && (q.includes(inst) || inst.includes(q))) return 0.10;
      return 0;
    }

    const rescoredWithBonus = rescored
      .map(r => ({ ...r, hybrid: r.hybrid + nameHitBonus(r.row, userQuery) }))
      .sort((a, b) => b.hybrid - a.hybrid);

    const topRecords = rescoredWithBonus.slice(0, 5).map(r => r.row);

    // ===== CSV検索 =====
    const csvDocs = loadCsvDocs();
    const csvScored = csvDocs
      .map(d => ({ d, s: scoreCsvDoc(userQuery, d) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 3);

    // ===== コンテキスト結合 =====
    const contextText = [
      ...topRecords.map((c, k) => `[R${k+1}] ${c.name ?? ""} / ${c.instructor ?? ""}\n${c.description || c.content || ""}\n出典: ${c.source_url || c.source_path || ""}`),
      ...csvScored.map((c, k) => `[C${k+1}] ${c.d.title} / ${c.d.meta.instructor || ""}\n${c.d.body}\n出典: ${c.d.meta.source_url || c.d.meta.file_path}`)
    ].join("\n\n---\n\n");

    const prompt = `あなたは早稲田大学の履修相談アシスタントです。
次の資料（公式シラバス/学部配布PDF/CSV抜粋）やChatGPTの回答を根拠に、ユーザーの質問に日本語で親しみやすく、簡潔かつ正確に答えてください。
アバウトな質問の場合は、概要について聞かれた時のように出力してください。
概要が200字に満たない場合は「授業計画」「成績評価方法」の順で補ってください。ただし、項目ごとに書くのではなく自然な文章にしてください。
情報が無い項目は出さず、省略してください。

回答する科目名をユーザーの知りたい科目名と一致させるため、回答の冒頭に「【】」（括弧の中にシラバスにある正式な科目名を入れる）を必要に応じて入れてください。
根拠が複数ある場合は必要に応じてそれらを組み合わせてください。

根拠となる文章をそのままコピペせず、必ず自分の言葉で言い換えてください。
# ユーザーの質問
${userQuery}

# 参考資料
${contextText}`;

    const chatResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.CHAT_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      }),
    }).then(r => r.json());

    const answer = chatResp?.choices?.[0]?.message?.content ?? "（回答なし）";
    return NextResponse.json({ answer });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
