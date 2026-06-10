// Shared domain types for Compass.

export type LegalStatus = "voluntary" | "mandatory" | "mixed";

export type JurisdictionId = "ASEAN" | "Singapore" | "EU";

/** A single sourced obligation, matching the §6 outputSchema item shape. */
export interface Requirement {
  requirement: string;
  binding: boolean;
  source_url: string;
}

/** The structured extraction returned per jurisdiction (the §6 outputSchema). */
export interface JurisdictionExtract {
  jurisdiction: string;
  legal_status: LegalStatus;
  key_instruments: string[];
  requirements: Requirement[];
  extraterritorial_reach: string;
}

/** One retrieved source from Exa's results[] array. */
export interface RetrievedSource {
  url: string;
  title: string | null;
  publishedDate: string | null;
  highlights: string[];
  text?: string;
}

// ── Agent loop (v2 agentic framing, brief §2A) ──────────────────────────────

/** Verdict from the sufficiency judge (assess_coverage). Swappable det/LLM. */
export interface CoverageVerdict {
  sufficient: boolean;
  sourcedRequirements: number;
  hasStatus: boolean;
  hasExtraterritorial: boolean;
  distinctDomains: number;
  reason: string;
}

export type TracePhase = "PLAN" | "ACT" | "OBSERVE" | "REFLECT" | "FINALIZE";

/** One recorded step in the agent's loop, for the trace panel (§8). */
export interface TraceStep {
  /** 1-based retrieval iteration; 0 for plan/finalize bookkeeping steps. */
  iteration: number;
  jurisdiction: JurisdictionId | "ALL";
  phase: TracePhase;
  /** Short human-readable label of the action taken. */
  action: string;
  query?: string;
  dropDomainFilter?: boolean;
  resultsCount?: number;
  kept?: number;
  dropped?: number;
  verdict?: "sufficient" | "insufficient" | "grounded" | "budget_exhausted";
  reason?: string;
}

export interface AgentTrace {
  steps: TraceStep[];
  retrievalsUsed: number;
  maxRetrievals: number;
  /** Which sufficiency judge ran — the swappable point of real agency. */
  judge: "deterministic" | "llm";
  /** True when the whole run was replayed from cache (not freshly executed). */
  replayed: boolean;
}

/** Post-loop COMPARE/synthesis narrative (constrained Anthropic, fixture-gated). */
export interface Synthesis {
  narrative: string;
  model: string;
  fromFixture: boolean;
}

/**
 * A fully processed jurisdiction: the validated extract plus the raw retrieved
 * sources (for the source drawer) and provenance metadata.
 */
export interface JurisdictionResult {
  id: JurisdictionId;
  extract: JurisdictionExtract;
  sources: RetrievedSource[];
  /** ISO timestamp of when retrieval happened (live or cached). */
  retrievedAt: string;
  /** True when served from the on-disk cache rather than a fresh live call. */
  fromCache: boolean;
  /** Label shown when a fallback query was used (e.g. ASEAN secondary source). */
  sourceNote?: string;
  /** Requirements dropped in validation because their source_url was invented. */
  droppedCount: number;
}
