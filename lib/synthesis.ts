// Post-loop COMPARE / synthesis (brief §2A step 6a, option (a)). A single
// constrained Anthropic call reasons ACROSS the grounded extracts and writes the
// conflict + extraterritorial narrative. It is layered ON TOP of the
// deterministic table (lib/compare.ts) — it never drives the table structure and
// never invents a requirement or a URL. Gated: with no key, a template summary
// built from the grounded data is returned (clearly marked fromFixture).

import Anthropic from "@anthropic-ai/sdk";
import type { JurisdictionResult, Synthesis } from "./types";

const SYNTH_MODEL = "claude-haiku-4-5-20251001";

/** Compact, source-free view of the grounded data for the model to reason over. */
function digest(results: JurisdictionResult[]) {
  return results.map((r) => ({
    jurisdiction: r.id,
    legal_status: r.extract.legal_status,
    key_instruments: r.extract.key_instruments,
    requirements: r.extract.requirements.map((q) => ({
      requirement: q.requirement,
      binding: q.binding,
    })),
    extraterritorial_reach: r.extract.extraterritorial_reach,
  }));
}

const SYSTEM =
  "You compare AI regulatory requirements across jurisdictions for a " +
  "customer-facing generative AI chatbot. Using ONLY the structured data " +
  "provided, write a tight 3-4 sentence narrative that (1) contrasts the legal " +
  "status across jurisdictions, (2) names the sharpest conflict, and (3) " +
  "highlights the extraterritorial catch. Do NOT introduce any requirement, " +
  "instrument, or URL not present in the data. Do not give legal advice.";

/** Deterministic template fallback — summarises the grounded data, no model. */
function templateNarrative(results: JurisdictionResult[]): string {
  const byId = Object.fromEntries(results.map((r) => [r.id, r]));
  const status = (id: string) => byId[id]?.extract.legal_status ?? "unknown";
  const eu = byId["EU"]?.extract.extraterritorial_reach ?? "";
  return (
    `The same chatbot faces ${status("ASEAN")} obligations in ASEAN, ` +
    `${status("Singapore")} obligations in Singapore, and ${status("EU")} ` +
    `obligations in the EU — a clear governance-maturity gap. The sharpest ` +
    `conflict is transparency and automated-decision handling, which is advisory ` +
    `in ASEAN but legally binding in the EU. ` +
    (eu
      ? `Critically, ${eu.charAt(0).toLowerCase()}${eu.slice(1)}`
      : `Critically, the EU's rules reach companies outside its borders that serve EU users.`)
  );
}

export async function synthesize(
  results: JurisdictionResult[]
): Promise<Synthesis> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return {
      narrative: templateNarrative(results),
      model: SYNTH_MODEL,
      fromFixture: true,
    };
  }

  const client = new Anthropic({ apiKey: key });
  const msg = await client.messages.create({
    model: SYNTH_MODEL,
    max_tokens: 400,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Structured grounded data:\n${JSON.stringify(digest(results), null, 2)}`,
      },
    ],
  });

  const narrative = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return {
    narrative: narrative || templateNarrative(results),
    model: msg.model ?? SYNTH_MODEL,
    fromFixture: false,
  };
}
