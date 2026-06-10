// The three jurisdictions and their verified Exa payloads (brief §5).
// camelCase throughout (raw JSON API convention, per brief §2.4).
// category: "news" everywhere so date filtering works (brief §2.2).

import type { JurisdictionId } from "./types";
import { OUTPUT_SCHEMA, SYSTEM_PROMPT } from "./schema";

export interface ExaSearchPayload {
  query: string;
  type: "deep";
  category: "news";
  numResults: number;
  startPublishedDate: string;
  includeDomains?: string[];
  contents: {
    text: { maxCharacters: number };
    highlights: { numSentences: number };
  };
  outputSchema: typeof OUTPUT_SCHEMA;
  systemPrompt: string;
}

export interface JurisdictionConfig {
  id: JurisdictionId;
  label: string;
  /** Primary payload. */
  payload: ExaSearchPayload;
  /** Fallback used only if primary results are thin (ASEAN — brief §5). */
  fallback?: {
    note: string;
    patch: Partial<ExaSearchPayload>;
  };
}

const BASE = {
  type: "deep" as const,
  category: "news" as const,
  numResults: 8,
  startPublishedDate: "2024-01-01T00:00:00.000Z",
  contents: {
    text: { maxCharacters: 3000 },
    highlights: { numSentences: 3 },
  },
  outputSchema: OUTPUT_SCHEMA,
  systemPrompt: SYSTEM_PROMPT,
};

export const JURISDICTIONS: JurisdictionConfig[] = [
  {
    id: "ASEAN",
    label: "ASEAN",
    payload: {
      ...BASE,
      query:
        "ASEAN guidelines on AI governance and ethics requirements for generative AI chatbots processing personal data automated decision-making",
      includeDomains: ["asean.org"],
    },
    // Brief §5: ASEAN is HIGH RISK. If results are thin, drop includeDomains,
    // tighten the query, and run full-web as a secondary compilation source.
    fallback: {
      note: "Secondary compilation source — full-web fallback (asean.org returned thin results)",
      patch: {
        query:
          "ASEAN Guide on AI Governance and Ethics 2024 voluntary framework chatbot personal data",
        includeDomains: undefined,
      },
    },
  },
  {
    id: "Singapore",
    label: "Singapore",
    payload: {
      ...BASE,
      query:
        "Singapore Model AI Governance Framework AI Verify PDPA requirements generative AI chatbot personal data consent automated decisions",
      includeDomains: ["imda.gov.sg", "pdpc.gov.sg"],
    },
  },
  {
    id: "EU",
    label: "EU",
    payload: {
      ...BASE,
      // "extraterritorial scope" is intentional — feeds the demo's key reveal.
      query:
        "EU AI Act risk classification transparency obligations GDPR automated decision-making generative AI chatbot extraterritorial scope",
      includeDomains: ["digital-strategy.ec.europa.eu", "eur-lex.europa.eu"],
    },
  },
];

export function getJurisdiction(id: JurisdictionId): JurisdictionConfig {
  const j = JURISDICTIONS.find((x) => x.id === id);
  if (!j) throw new Error(`Unknown jurisdiction: ${id}`);
  return j;
}
