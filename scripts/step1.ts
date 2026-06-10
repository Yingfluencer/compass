// Step 1 (still stands): one validated Singapore deep+schema retrieval, now run
// THROUGH the agent's tool surface (exaDeepSearch -> validateSources) to prove
// the tools the agent loop calls still work end to end.
//
//   npm run step1            -> Singapore via the tools, against fixtures
//   npm run step1 -- --live  -> Singapore via the tools, live Exa call

import "dotenv/config";
import { getJurisdiction } from "../lib/jurisdictions";
import { exaDeepSearch, validateSources, measureCoverage } from "../lib/tools";

const mode = process.argv.includes("--live") ? "live" : "fixture";

async function main() {
  const sg = getJurisdiction("Singapore");

  console.log("=".repeat(72));
  console.log(`COMPASS · Step 1 · Singapore · via tool surface · mode=${mode.toUpperCase()}`);
  console.log("=".repeat(72));

  // ACT: the exa_deep_search tool.
  const retrieval = await exaDeepSearch(sg, {}, mode);
  console.log(`\nexa_deep_search → ${retrieval.sources.length} sources:`);
  for (const s of retrieval.sources) console.log(`  • ${s.url}`);

  // OBSERVE: the validate_sources tool.
  const { extract, kept, dropped } = validateSources(retrieval);
  console.log(
    `\nvalidate_sources → ${kept.length} kept, ${dropped.length} dropped (invented source_url):`
  );
  for (const d of dropped) {
    console.log(`  ✗ DROPPED: "${d.requirement}"`);
    console.log(`            source_url not in retrieved set: ${d.source_url}`);
  }

  // assess_coverage measurement.
  const coverage = measureCoverage(extract, retrieval.sources);
  console.log(
    `\nassess_coverage → ${coverage.sourcedRequirements} sourced reqs · ` +
      `${coverage.distinctDomains} domains · status=${coverage.hasStatus} · ` +
      `extraterritorial=${coverage.hasExtraterritorial}`
  );

  console.log("\nEXTRACT (validated structured JSON):");
  console.log(JSON.stringify(extract, null, 2));

  console.log("\n" + "=".repeat(72));
  console.log(
    `RESULT: ${extract.jurisdiction} · legal_status=${extract.legal_status} · ` +
      `${extract.requirements.length} source-backed requirements`
  );
  console.log("=".repeat(72));
}

main().catch((err) => {
  console.error("\nStep 1 failed:", err.message);
  process.exit(1);
});
