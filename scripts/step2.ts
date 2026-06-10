// Step 2 (v2 agentic): exercise the agent loop and print its decision trace.
//
//   npm run step2            -> agent loop over fixtures (shows ASEAN recovery)
//   npm run step2 -- --live  -> live agent run (Exa + synthesis; needs keys)

import "dotenv/config";
import { runAgent } from "../lib/agent";

const mode = process.argv.includes("--live") ? "live" : "fixture";

async function main() {
  console.log("=".repeat(72));
  console.log(`COMPASS · Step 2 · AGENT LOOP · mode=${mode.toUpperCase()}`);
  console.log("=".repeat(72));

  const { results, trace, synthesis } = await runAgent(mode);

  console.log("\nAGENT TRACE:");
  for (const s of trace.steps) {
    const it = s.iteration ? `#${s.iteration}` : "  ";
    const extras = [
      s.resultsCount !== undefined ? `results=${s.resultsCount}` : "",
      s.kept !== undefined ? `kept=${s.kept}` : "",
      s.dropped !== undefined ? `dropped=${s.dropped}` : "",
      s.verdict ? `verdict=${s.verdict}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    console.log(`  ${it} [${s.phase.padEnd(8)}] ${s.jurisdiction.padEnd(10)} ${s.action}`);
    if (extras) console.log(`         ${extras}`);
    if (s.reason) console.log(`         ↳ ${s.reason}`);
  }

  console.log(
    `\nRetrievals used: ${trace.retrievalsUsed}/${trace.maxRetrievals} · judge=${trace.judge}`
  );

  console.log("\nGROUNDED RESULTS:");
  for (const r of results) {
    console.log(
      `  ${r.id.padEnd(10)} ${r.extract.legal_status.padEnd(9)} ` +
        `${r.extract.requirements.length} reqs${r.sourceNote ? " · fallback" : ""}`
    );
  }

  console.log("\nSYNTHESIS" + (synthesis.fromFixture ? " (template, no key):" : ":"));
  console.log("  " + synthesis.narrative.replace(/\n/g, "\n  "));

  console.log("\n" + "=".repeat(72));
  console.log(
    "GOVERNANCE MATURITY LADDER: " +
      results.map((r) => `${r.id}=${r.extract.legal_status}`).join("  →  ")
  );
  console.log("=".repeat(72));
}

main().catch((err) => {
  console.error("\nStep 2 failed:", err.message);
  process.exit(1);
});
