// The shared outputSchema (brief §6) — IDENTICAL across all three jurisdictions
// so the comparison table aligns. Exa constraint: max nesting depth 2, max 10
// total properties. This schema is 8 properties at depth 2 — within limits.

export const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    jurisdiction: {
      type: "string",
      description: "ASEAN, Singapore, or EU",
    },
    legal_status: {
      type: "string",
      enum: ["voluntary", "mandatory", "mixed"],
      description:
        "Whether requirements are legally binding, voluntary/advisory, or mixed",
    },
    key_instruments: {
      type: "array",
      items: { type: "string" },
      description:
        "Names of the specific frameworks, acts, or guidelines that apply",
    },
    requirements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          requirement: {
            type: "string",
            description:
              "A specific obligation for a generative AI chatbot processing personal data",
          },
          binding: {
            type: "boolean",
            description: "True if legally enforceable, false if advisory",
          },
          source_url: {
            type: "string",
            description:
              "URL of the supporting source. Must come from retrieved results, not generated.",
          },
        },
        required: ["requirement", "binding", "source_url"],
      },
    },
    extraterritorial_reach: {
      type: "string",
      description:
        "Whether/how these rules apply to companies outside the jurisdiction serving its users",
    },
  },
  required: [
    "jurisdiction",
    "legal_status",
    "key_instruments",
    "requirements",
    "extraterritorial_reach",
  ],
} as const;

/** Guides the synthesis without letting the model assert unsourced facts. */
export const SYSTEM_PROMPT =
  "You are organizing regulatory requirements for a customer-facing generative " +
  "AI chatbot that processes personal data and makes automated decisions. " +
  "Use ONLY the retrieved sources. Every requirement's source_url MUST be one of " +
  "the URLs present in the retrieved results — never invent or guess a URL. " +
  "If a requirement has no supporting retrieved source, omit it. Do not provide " +
  "legal advice; report sourced requirements only.";
