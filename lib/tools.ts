// The agent's tool surface (brief §2A). Thin wrappers over existing retrieval +
// validation code. Crucially, the ASEAN thin->fallback decision is NOT baked in
// here anymore — the agent loop (lib/agent.ts) makes that call in REFLECT.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  type JurisdictionConfig,
  type ExaSearchPayload,
} from "./jurisdictions";
import { runDeepSearch, processRawJson, type ExaRetrieval } from "./exa";
import { validateExtract } from "./validate";
import type {
  CoverageVerdict,
  JurisdictionExtract,
  JurisdictionId,
  RetrievedSource,
} from "./types";

export type RunMode = "live" | "fixture";

/** Options the agent can pass to widen/reformulate a search. */
export interface SearchOptions {
  query?: string;
  dropDomainFilter?: boolean;
}

// ── Fixture loading ─────────────────────────────────────────────────────────
// ASEAN has TWO fixtures so the demo shows the recovery beat deterministically:
//   primary (domain-filtered) -> thin   ;   fallback (domain dropped) -> good.
function fixtureName(id: JurisdictionId, dropDomainFilter: boolean): string {
  if (id === "ASEAN") return dropDomainFilter ? "asean" : "asean_thin";
  if (id === "Singapore") return "singapore";
  return "eu";
}

function loadFixture(id: JurisdictionId, dropDomainFilter: boolean): ExaRetrieval {
  const path = resolve(
    process.cwd(),
    "fixtures",
    `${fixtureName(id, dropDomainFilter)}.json`
  );
  return processRawJson(JSON.parse(readFileSync(path, "utf8")));
}

function buildPayload(
  config: JurisdictionConfig,
  opts: SearchOptions
): ExaSearchPayload {
  const payload: ExaSearchPayload = { ...config.payload };
  if (opts.query) payload.query = opts.query;
  if (opts.dropDomainFilter) {
    delete (payload as { includeDomains?: string[] }).includeDomains;
  }
  return payload;
}

// ── Tool 1: exa_deep_search ──────────────────────────────────────────────────
/** One Exa deep + outputSchema retrieval. No automatic fallback. */
export async function exaDeepSearch(
  config: JurisdictionConfig,
  opts: SearchOptions,
  mode: RunMode
): Promise<ExaRetrieval> {
  if (mode === "live") return runDeepSearch(buildPayload(config, opts));
  return loadFixture(config.id, !!opts.dropDomainFilter);
}

// ── Tool 2: validate_sources ─────────────────────────────────────────────────
/** Drop requirements whose source_url wasn't retrieved (§2.5). */
export function validateSources(retrieval: ExaRetrieval) {
  return validateExtract(retrieval.extract, retrieval.retrievedUrls);
}

// ── Tool 3: assess_coverage (deterministic sufficiency judge lives here) ─────
function hostOf(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return url;
  }
}

/** Pure coverage measurement used by the deterministic judge. */
export function measureCoverage(
  extract: JurisdictionExtract,
  sources: RetrievedSource[]
): Omit<CoverageVerdict, "sufficient" | "reason"> {
  const sourcedRequirements = extract.requirements.length;
  const hasStatus = !!extract.legal_status;
  const hasExtraterritorial =
    !!extract.extraterritorial_reach &&
    extract.extraterritorial_reach.trim().length > 0;
  const distinctDomains = new Set(
    [
      ...extract.requirements.map((r) => hostOf(r.source_url)),
      ...sources.map((s) => hostOf(s.url)),
    ].filter(Boolean)
  ).size;
  return {
    sourcedRequirements,
    hasStatus,
    hasExtraterritorial,
    distinctDomains,
  };
}
