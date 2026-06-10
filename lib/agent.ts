// The agent loop (brief §2A): a DETERMINISTIC controller running
// PLAN -> ACT -> OBSERVE -> REFLECT -> STOP per jurisdiction, bounded by an
// iteration budget, then FINALIZE (post-loop COMPARE/synthesis + Monitor). Every
// decision is recorded as a trace step. Decision points (the sufficiency judge)
// are awaited behind an interface so a real LLM judge can be swapped in later.

import { JURISDICTIONS, getJurisdiction } from "./jurisdictions";
import { exaDeepSearch, validateSources, type RunMode } from "./tools";
import {
  deterministicJudge,
  type SufficiencyJudge,
} from "./sufficiency";
import { synthesize } from "./synthesis";
import { MONITOR_CONFIG } from "./monitor";
import { readRun, writeRun } from "./cache";
import type {
  AgentTrace,
  JurisdictionId,
  JurisdictionResult,
  Synthesis,
  TraceStep,
} from "./types";

export type AgentMode = "live" | "cache" | "fixture";

const MAX_RETRIEVALS = 6; // up to one retry per jurisdiction (brief §2A)

// PLAN order: reliable jurisdictions first, ASEAN (known-risky) last.
const PLAN_ORDER: JurisdictionId[] = ["Singapore", "EU", "ASEAN"];
// Display order: the governance maturity ladder.
const DISPLAY_ORDER: JurisdictionId[] = ["ASEAN", "Singapore", "EU"];

export interface AgentRun {
  results: JurisdictionResult[];
  trace: AgentTrace;
  synthesis: Synthesis;
}

export interface RunOptions {
  /** Sufficiency judge to use. Defaults to the deterministic one. */
  judge?: SufficiencyJudge;
  /** Whether to write the run to cache. Defaults to (mode === "live"). */
  persist?: boolean;
}

/** Ground one jurisdiction: ACT/OBSERVE/REFLECT, with at most one re-query. */
async function groundJurisdiction(
  id: JurisdictionId,
  runMode: RunMode,
  judge: SufficiencyJudge,
  steps: TraceStep[],
  budget: { used: number },
): Promise<JurisdictionResult> {
  const config = getJurisdiction(id);

  steps.push({
    iteration: 0,
    jurisdiction: id,
    phase: "PLAN",
    action: `Plan retrieval for ${id}`,
    reason: config.fallback
      ? "Known-risky jurisdiction; primary domain-filtered query first, fallback ready."
      : "Reliable jurisdiction; primary query.",
  });

  let attempt = 0;
  let dropDomainFilter = false;
  let query: string | undefined;
  let sourceNote: string | undefined;
  let last: {
    result: JurisdictionResult;
    sufficient: boolean;
  } | null = null;

  // Up to two attempts: primary, then (if a fallback exists) one re-query.
  for (;;) {
    if (budget.used >= MAX_RETRIEVALS) {
      steps.push({
        iteration: budget.used,
        jurisdiction: id,
        phase: "REFLECT",
        action: `Budget exhausted for ${id}`,
        verdict: "budget_exhausted",
        reason: `Iteration budget (${MAX_RETRIEVALS}) reached; accepting best available.`,
      });
      break;
    }

    attempt += 1;
    budget.used += 1;
    const iteration = budget.used;

    // ACT
    const retrieval = await exaDeepSearch(config, { query, dropDomainFilter }, runMode);
    steps.push({
      iteration,
      jurisdiction: id,
      phase: "ACT",
      action: `exa_deep_search(${id})${dropDomainFilter ? " · domain filter dropped" : ""}`,
      query: query ?? config.payload.query,
      dropDomainFilter,
      resultsCount: retrieval.sources.length,
    });

    // OBSERVE: validate, then assess coverage.
    const { extract, kept, dropped } = validateSources(retrieval);
    const verdict = await judge.assess({
      jurisdiction: id,
      extract,
      sources: retrieval.sources,
    });
    steps.push({
      iteration,
      jurisdiction: id,
      phase: "OBSERVE",
      action: `validate_sources + assess_coverage(${id})`,
      kept: kept.length,
      dropped: dropped.length,
      verdict: verdict.sufficient ? "sufficient" : "insufficient",
      reason: verdict.reason,
    });

    const result: JurisdictionResult = {
      id,
      extract,
      sources: retrieval.sources,
      retrievedAt: new Date().toISOString(),
      fromCache: false,
      sourceNote,
      droppedCount: dropped.length,
    };
    last = { result, sufficient: verdict.sufficient };

    // REFLECT
    if (verdict.sufficient) {
      steps.push({
        iteration,
        jurisdiction: id,
        phase: "REFLECT",
        action: `${id} grounded`,
        verdict: "grounded",
        reason: "Coverage sufficient; stop searching this jurisdiction.",
      });
      break;
    }

    const canRetry = attempt === 1 && !!config.fallback;
    if (canRetry) {
      steps.push({
        iteration,
        jurisdiction: id,
        phase: "REFLECT",
        action: `Reformulate ${id} query`,
        verdict: "insufficient",
        reason: `${verdict.reason} Retrying full-web with tightened query (${config.fallback!.note}).`,
      });
      query = config.fallback!.patch.query ?? query;
      dropDomainFilter = true;
      sourceNote = config.fallback!.note;
      continue;
    }

    // No retry available — accept what we have.
    steps.push({
      iteration,
      jurisdiction: id,
      phase: "REFLECT",
      action: `${id} accepted (no further options)`,
      verdict: "grounded",
      reason: `${verdict.reason} No fallback left; accepting best available.`,
    });
    break;
  }

  return last!.result;
}

/** Run the full agent: loop over jurisdictions, then finalize (synthesis + monitor). */
export async function runAgent(
  mode: AgentMode,
  opts: RunOptions = {}
): Promise<AgentRun> {
  // Demo default: replay a cached run identically when one exists.
  if (mode === "cache") {
    const cached = readRun();
    if (cached) return cached;
    mode = "fixture";
  }

  const runMode: RunMode = mode === "live" ? "live" : "fixture";
  const judge = opts.judge ?? deterministicJudge;
  const persist = opts.persist ?? mode === "live";
  const steps: TraceStep[] = [];
  const budget = { used: 0 };

  const grounded: JurisdictionResult[] = [];
  for (const id of PLAN_ORDER) {
    grounded.push(await groundJurisdiction(id, runMode, judge, steps, budget));
  }

  // FINALIZE (a): post-loop COMPARE / synthesis (constrained Anthropic).
  const synthesis = await synthesize(grounded);
  steps.push({
    iteration: 0,
    jurisdiction: "ALL",
    phase: "FINALIZE",
    action: "compare + synthesize cross-jurisdiction narrative",
    reason: synthesis.fromFixture
      ? "Template summary (no ANTHROPIC_API_KEY) over the grounded extracts."
      : `Anthropic synthesis (${synthesis.model}) over the grounded extracts.`,
  });

  // FINALIZE (b): the agent's closing action — set up an Exa Monitor.
  steps.push({
    iteration: 0,
    jurisdiction: "ALL",
    phase: "FINALIZE",
    action: `set up Exa Monitor "${MONITOR_CONFIG.name}"`,
    reason: "Standing watch on the sources so the comparison stays current.",
  });

  // Sort to display order (maturity ladder).
  grounded.sort(
    (a, b) => DISPLAY_ORDER.indexOf(a.id) - DISPLAY_ORDER.indexOf(b.id)
  );

  const trace: AgentTrace = {
    steps,
    retrievalsUsed: budget.used,
    maxRetrievals: MAX_RETRIEVALS,
    judge: judge.name,
    replayed: false,
  };

  const run: AgentRun = { results: grounded, trace, synthesis };

  // Write-through so the staged demo replays instantly and identically.
  if (persist) writeRun(run);

  return run;
}

/** Convenience for scripts: the jurisdiction configs in plan order. */
export const PLANNED_JURISDICTIONS = PLAN_ORDER.map(getJurisdiction);
export { JURISDICTIONS };
