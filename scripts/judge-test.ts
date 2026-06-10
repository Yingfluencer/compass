// Live test of the LLM sufficiency judge (option C). Runs the agent live against
// real Exa with the LLM judge, but does NOT persist — the approved deterministic
// live cache stays the default. Reports honestly whether ASEAN recovers on real
// data. Nothing here is tuned to force a retry.
//
//   npm run judge-test

import "dotenv/config";
import { runAgent } from "../lib/agent";
import { llmJudge } from "../lib/sufficiency";

async function main() {
  console.log("=".repeat(72));
  console.log("COMPASS · LLM SUFFICIENCY JUDGE · live · (cache NOT overwritten)");
  console.log("=".repeat(72));

  const t0 = Date.now();
  const { results, trace } = await runAgent("live", {
    judge: llmJudge,
    persist: false,
  });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`\njudge=${trace.judge} · retrievals ${trace.retrievalsUsed}/${trace.maxRetrievals} · ${secs}s\n`);

  console.log("PER-JURISDICTION VERDICTS (in execution order):");
  for (const s of trace.steps) {
    if (s.phase === "ACT") {
      console.log(
        `  ACT      ${s.jurisdiction.padEnd(10)} #${s.iteration} ` +
          `results=${s.resultsCount} dropFilter=${s.dropDomainFilter}`
      );
    }
    if (s.phase === "OBSERVE") {
      console.log(
        `  OBSERVE  ${s.jurisdiction.padEnd(10)} #${s.iteration} ` +
          `kept=${s.kept} verdict=${s.verdict}`
      );
      console.log(`           ↳ ${s.reason}`);
    }
    if (s.phase === "REFLECT") {
      console.log(`  REFLECT  ${s.jurisdiction.padEnd(10)} ${s.action} (${s.verdict})`);
    }
  }

  const aseanActs = trace.steps.filter(
    (s) => s.jurisdiction === "ASEAN" && s.phase === "ACT"
  ).length;

  console.log("\n" + "=".repeat(72));
  console.log("VERDICT ON OPTION (C):");
  if (aseanActs > 1) {
    console.log("  ASEAN RECOVERY FIRED on real data — the LLM judge found the");
    console.log("  initial domain-filtered results insufficient and the agent widened.");
  } else {
    console.log("  ASEAN grounded in ONE pass — the LLM judge found the live");
    console.log("  asean.org evidence SUFFICIENT. Recovery did NOT fire on real data.");
    console.log("  (Valid finding; option A stands. Nothing tuned to change this.)");
  }
  console.log("=".repeat(72));

  console.log("\nGrounded results:");
  for (const r of results) {
    console.log(
      `  ${r.id.padEnd(10)} ${r.extract.legal_status.padEnd(9)} ` +
        `${r.extract.requirements.length} reqs${r.sourceNote ? " · fallback" : ""}`
    );
  }
}

main().catch((err) => {
  console.error("\nJudge test failed:", err.message);
  process.exit(1);
});
