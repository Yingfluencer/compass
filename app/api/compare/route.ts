// GET /api/compare — runs the pipeline (fixture by default, ?mode=live for a
// real Exa run) and returns the aligned comparison table.

import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";
import { buildComparison } from "@/lib/compare";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const param = searchParams.get("mode");
  const mode =
    param === "live" ? "live" : param === "fixture" ? "fixture" : "cache";

  try {
    const { results, trace, synthesis } = await runAgent(mode);
    const comparison = buildComparison(results);
    return NextResponse.json({ mode, comparison, trace, synthesis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
