// GET /api/baseline — the plain-LLM (no retrieval) answer for the contrast panel.

import { NextResponse } from "next/server";
import { callBaseline } from "@/lib/baseline";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await callBaseline();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
