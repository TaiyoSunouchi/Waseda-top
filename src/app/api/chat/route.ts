const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini"; // 安価
const TEMPERATURE = 0.2;

// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// （任意）型が欲しければこれでOK。面倒なら any でも動きます。
type Role = "user" | "assistant" | "system";
type Message = { id: string; role: Role; content: string };

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as { messages: Message[] };
    const last10 = messages.slice(-10); // 会話の末尾だけ送る（トークン節約）

    // OpenAIクライアント
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // OpenAI へ渡すメッセージに変換
    const chatMessages = [
      {
        role: "system" as const,
        content:
          "あなたは早稲田大学の履修相談アシスタントWasedaAIです。マイルストーンは逐語引用せず、要点だけを言い換えて答えてください。",
      },
      ...last10.map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      })),
    ];

    // いちばん簡単：レスポンスAPIのチャット（非ストリーミング）
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini", // 速くて安いモデル。精度重視なら gpt-4.1 や o3-mini など
      messages: chatMessages,
      temperature: 0.2,
    });

    const text = resp.choices[0]?.message?.content ?? "（応答を生成できませんでした）";

    const reply: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: text,
    };

    return NextResponse.json({ message: reply });
  } catch (err: any) {
    console.error("API error:", err);
    const msg =
      err?.message ??
      (typeof err === "string" ? err : "サーバ側でエラーが発生しました。もう一度お試しください。");
    const reply: Message = { id: crypto.randomUUID(), role: "assistant", content: `エラー：${msg}` };
    return NextResponse.json({ message: reply }, { status: 200 });
  }
}
