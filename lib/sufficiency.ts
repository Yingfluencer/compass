// The sufficiency judge (brief §2A) — "is my evidence sufficient?". This is the
// most defensible, most visible point of real agency, so it's behind an interface
// and AWAITED by the controller: a deterministic judge ships now; a genuine
// Anthropic-backed judge can be dropped in later WITHOUT touching the loop.

import Anthropic from "@anthropic-ai/sdk";
import { measureCoverage } from "./tools";
import { USE_CASE } from "./baseline";
import type {
  CoverageVerdict,
  JurisdictionExtract,
  RetrievedSource,
} from "./types";

export interface JudgeInput {
  jurisdiction: string;
  extract: JurisdictionExtract;
  sources: RetrievedSource[];
}

export interface SufficiencyJudge {
  readonly name: "deterministic" | "llm";
  assess(input: JudgeInput): Promise<CoverageVerdict>;
}

/** Minimum sourced requirements before a jurisdiction is considered grounded. */
const MIN_SOURCED_REQUIREMENTS = 2;

/**
 * Deterministic judge: a jurisdiction is sufficient when it has enough
 * source-backed requirements AND a legal status AND an extraterritorial finding.
 */
export const deterministicJudge: SufficiencyJudge = {
  name: "deterministic",
  async assess({ extract, sources }): Promise<CoverageVerdict> {
    const m = measureCoverage(extract, sources);
    const sufficient =
      m.sourcedRequirements >= MIN_SOURCED_REQUIREMENTS &&
      m.hasStatus &&
      m.hasExtraterritorial;

    const reason = sufficient
      ? `${m.sourcedRequirements} source-backed requirements across ${m.distinctDomains} domain(s); status and extraterritorial reach present.`
      : m.sourcedRequirements < MIN_SOURCED_REQUIREMENTS
        ? `Only ${m.sourcedRequirements} source-backed requirement(s) (need ${MIN_SOURCED_REQUIREMENTS}).`
        : !m.hasStatus
          ? "Legal status missing."
          : "Extraterritorial reach missing.";

    return { ...m, sufficient, reason };
  },
};

// ── LLM judge (the reserved upgrade, brief §2A) ─────────────────────────────
// Sends the validated extract + retrieved source highlights to Anthropic and
// asks whether the evidence is sufficient to answer the binding-obligations
// question for THIS jurisdiction. The numeric coverage fields still come from
// measureCoverage(); only the sufficient/reason judgment is the model's.
//
// HONESTY GUARDRAIL: the prompt is deliberately neutral and fair to voluntary
// frameworks — a clearly-stated set of non-binding recommendations IS a valid
// sufficient answer. We do NOT bias it toward declaring any jurisdiction thin.

const JUDGE_MODEL = "claude-haiku-4-5-20251001";

const JUDGE_SYSTEM =
  "You are a research-sufficiency judge for a regulatory comparison tool. For " +
  "ONE jurisdiction, you are given the obligations extracted for a specific AI " +
  "use case plus the retrieved source highlights. Decide whether the evidence is " +
  "SUFFICIENT to answer: \"What obligations apply to this use case here, and is " +
  "each binding or advisory?\"\n\n" +
  "SUFFICIENT = the sources let a reader state the concrete obligations or " +
  "recommendations that apply AND determine their binding status. A voluntary, " +
  "non-binding framework is perfectly sufficient when it clearly establishes that " +
  "status and its specific recommended practices — do NOT treat 'voluntary' as " +
  "'insufficient'. INSUFFICIENT = sources are off-topic or missing, key " +
  "obligations for the use case are absent, or binding status cannot be " +
  "determined. Judge on the merits; do not assume any jurisdiction is weak.\n\n" +
  'Return ONLY minified JSON: {"sufficient": <bool>, "reason": "<one sentence>"}.';

function buildJudgeUser(input: JudgeInput): string {
  const reqs = input.extract.requirements
    .map((r) => `- (${r.binding ? "binding" : "advisory"}) ${r.requirement}`)
    .join("\n");
  const highlights = input.sources
    .flatMap((s) => s.highlights)
    .slice(0, 12)
    .map((h) => `• ${h}`)
    .join("\n");
  return (
    `Use case: ${USE_CASE}\n` +
    `Jurisdiction: ${input.jurisdiction}\n` +
    `Legal status (extracted): ${input.extract.legal_status}\n` +
    `Extraterritorial reach present: ${input.extract.extraterritorial_reach.trim().length > 0}\n\n` +
    `Extracted obligations (${input.extract.requirements.length}):\n${reqs || "(none)"}\n\n` +
    `Retrieved source highlights:\n${highlights || "(none)"}`
  );
}

export const llmJudge: SufficiencyJudge = {
  name: "llm",
  async assess(input): Promise<CoverageVerdict> {
    const m = measureCoverage(input.extract, input.sources);
    const key = process.env.ANTHROPIC_API_KEY;

    // No key or any failure -> fall back to the deterministic verdict, and say so.
    if (!key) {
      const fb = await deterministicJudge.assess(input);
      return { ...fb, reason: `[llm judge unavailable: no key] ${fb.reason}` };
    }

    try {
      const client = new Anthropic({ apiKey: key });
      const msg = await client.messages.create({
        model: JUDGE_MODEL,
        max_tokens: 200,
        system: JUDGE_SYSTEM,
        messages: [{ role: "user", content: buildJudgeUser(input) }],
      });
      const text = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      return {
        ...m,
        sufficient: !!json.sufficient,
        reason: String(json.reason ?? "(no reason given)"),
      };
    } catch (e) {
      const fb = await deterministicJudge.assess(input);
      return {
        ...fb,
        reason: `[llm judge errored: ${(e as Error).message}] ${fb.reason}`,
      };
    }
  },
};
