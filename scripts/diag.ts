// One-off diagnostic: hit the raw Exa endpoint once for Singapore and report the
// ACTUAL response transport (SSE vs single JSON body) + top-level shape, so we
// know whether the SSE reassembly path was exercised on a real deep+schema call.

import "dotenv/config";
import { getJurisdiction } from "../lib/jurisdictions";

async function main() {
  const sg = getJurisdiction("Singapore");
  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.EXA_API_KEY!,
    },
    body: JSON.stringify(sg.payload),
  });

  const ct = res.headers.get("content-type") ?? "";
  console.log("status        :", res.status);
  console.log("content-type  :", ct);
  console.log("is SSE?       :", ct.includes("text/event-stream"));

  const text = await res.text();
  console.log("body length   :", text.length);
  console.log("body starts   :", JSON.stringify(text.slice(0, 80)));

  if (!ct.includes("text/event-stream")) {
    try {
      const j = JSON.parse(text);
      console.log("top-level keys:", Object.keys(j).join(", "));
      console.log("results count :", j.results?.length);
      console.log(
        "output.content type:",
        j.output ? typeof j.output.content : "(no output)"
      );
      console.log(
        "has output.grounding:",
        !!j.output?.grounding,
        Array.isArray(j.output?.grounding) ? `(${j.output.grounding.length})` : ""
      );
    } catch (e) {
      console.log("JSON parse failed:", (e as Error).message);
    }
  } else {
    console.log("first 3 SSE lines:");
    console.log(text.split("\n").slice(0, 3).join("\n"));
  }
}

main().catch((e) => {
  console.error("diag failed:", e.message);
  process.exit(1);
});
