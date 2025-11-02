import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const unifiedUrl = process.env.UNIFIED_RAG_URL || 'http://localhost:8000/search';

  const resp = await fetch(unifiedUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  return new Response(text, { status: resp.status, headers: { 'Content-Type': 'application/json' } });
}