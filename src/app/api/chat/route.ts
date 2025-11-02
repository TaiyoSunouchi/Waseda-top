// src/app/api/ask/route.ts
import { NextRequest, NextResponse } from "next/server";

const DIFY_API_URL =
  process.env.DIFY_API_URL || "https://api.dify.ai/v1/chat-messages";
const DIFY_API_KEY = process.env.DIFY_API_KEY;

// 学部ごとのキー（あるものだけ書く。ないのは空でOK）
const FACULTY_CONFIG: Record<string, { url?: string; key?: string }> = {
  law: { key: process.env.DIFY_API_KEY_LAW },
  commerce: { key: process.env.DIFY_API_KEY_COMMERCE },
  poli: { key: process.env.DIFY_API_KEY_POLI },
  letters: { key: process.env.DIFY_API_KEY_LETTERS },
  culture: { key: process.env.DIFY_API_KEY_CULTURE },
  education: { key: process.env.DIFY_API_KEY_EDU },
  social: { key: process.env.DIFY_API_KEY_SOCIAL },
  sil: { key: process.env.DIFY_API_KEY_SIL },
  human_sci: { key: process.env.DIFY_API_KEY_HUMAN_SCI },
  sport_sci: { key: process.env.DIFY_API_KEY_SPORT_SCI },
  fund_sci: { key: process.env.DIFY_API_KEY_FUND_SCI },
  creative_sci: { key: process.env.DIFY_API_KEY_CREATIVE_SCI },
  advanced_sci: { key: process.env.DIFY_API_KEY_ADVANCED_SCI },
};

export async function POST(req: NextRequest) {
  const { query, user, faculty } = await req.json();

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  // まずは今まで通り
  let usedUrl = DIFY_API_URL;
  let usedKey = DIFY_API_KEY;

  // faculty が送られてきていて、対応する設定があれば上書き
  const conf = faculty ? FACULTY_CONFIG[faculty] : undefined;
  if (conf?.url) usedUrl = conf.url;
  if (conf?.key) usedKey = conf.key;

  if (!usedKey) {
    return NextResponse.json(
      { error: "DIFY_API_KEY is missing" },
      { status: 500 }
    );
  }

  const payload = {
    query,
    inputs: {},
    response_mode: "blocking",
    user: user ?? "wasedaai-user",
  };

  console.log("[ask] calling Dify:", usedUrl, "faculty:", faculty || "(default)");

  const dfRes = await fetch(usedUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${usedKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!dfRes.ok) {
    const text = await dfRes.text();
    console.error("[ask] Dify error:", dfRes.status, text);
    return NextResponse.json(
      { error: `Dify API error: ${dfRes.status} ${text}` },
      { status: 500 }
    );
  }

  const data = await dfRes.json();

  const answer =
    data.answer ||
    data.output ||
    data.message ||
    "（Difyから回答が返ってきませんでした）";

  const rawResources: any[] =
    data.retriever_resources ||
    data.knowledge ||
    data.documents ||
    data.resources ||
    [];

  const citations = Array.isArray(rawResources)
    ? rawResources.map((r) => ({
        name: r.title || r.name || r.filename || r.id,
        source_url: r.url || r.source_url,
      }))
    : [];

  return NextResponse.json({ answer, citations });
}
