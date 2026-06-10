// Seed (brief §10.7): run all three jurisdictions LIVE against Exa once and
// write the results to the on-disk cache, so the demo runs instantly from cache.
//
//   npm run seed
//
// Requires EXA_API_KEY in .env. Cached results carry a real "retrievedAt"
// timestamp and are never faked.

import "dotenv/config";
import { runAgent } from "../lib/agent";
import { llmJudge } from "../lib/sufficiency";

async function main() {
  if (!process.env.EXA_API_KEY) {
    console.error("EXA_API_KEY is not set. Add it to .env first.");
    process.exit(1);
  }

  console.log("Seeding cache with a LIVE agent run (3 jurisdictions)…");
  console.log("Judge: LLM (real per-jurisdiction sufficiency reasoning).\n");

  const t0 = Date.now();
  const { results, trace } = await runAgent("live", { judge: llmJudge });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  for (const r of results) {
    console.log(
      `  ✓ ${r.id.padEnd(10)} ${r.extract.legal_status.padEnd(9)} ` +
        `${r.extract.requirements.length} reqs · ${r.sources.length} sources · ` +
        `${r.droppedCount} dropped${r.sourceNote ? " · fallback" : ""}`
    );
  }

  console.log(
    `\nAgent used ${trace.retrievalsUsed}/${trace.maxRetrievals} retrievals · ` +
      `judge=${trace.judge}`
  );
  console.log(`Done in ${secs}s. Run cached to data/cache/run.json.`);
  console.log("The app now replays this live-sourced run instantly (mode=cache).");
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
