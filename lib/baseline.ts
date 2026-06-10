// Naive-LLM baseline (brief §10.5): ask a plain model the SAME question with no
// retrieval and no sources. Shown beside the sourced table to make the contrast
// concrete — the plain answer is fluent but unsourced, undated, and unverifiable.
//
// If ANTHROPIC_API_KEY is absent we return a clearly-labelled representative
// sample (fromFixture=true) so the panel still demonstrates the contrast — it is
// never presented as a live answer.

import Anthropic from "@anthropic-ai/sdk";

const BASELINE_MODEL = "claude-haiku-4-5-20251001";

export const USE_CASE =
  "A customer-facing generative AI chatbot that processes personal data and makes automated decisions affecting users.";

const PROMPT =
  `Without browsing the web or citing sources, from your training knowledge: ` +
  `what regulatory requirements apply to "${USE_CASE}" in (1) ASEAN, ` +
  `(2) Singapore, and (3) the EU? Answer in a few short sentences per ` +
  `jurisdiction. Do not include URLs.`;

export interface BaselineResult {
  text: string;
  model: string;
  fromFixture: boolean;
}

const FIXTURE: BaselineResult = {
  model: BASELINE_MODEL,
  fromFixture: true,
  text:
    "ASEAN: There isn't a single binding AI law across ASEAN. The region has " +
    "generally favoured voluntary, principles-based guidance on AI ethics, and " +
    "member states handle data protection through their own national laws. You " +
    "should ensure transparency and protect personal data.\n\n" +
    "Singapore: Singapore promotes responsible AI through frameworks like the " +
    "Model AI Governance Framework, and personal data is covered by the PDPA. " +
    "Much of the AI-specific guidance is advisory, while data protection " +
    "obligations such as consent are generally enforceable.\n\n" +
    "EU: The EU has moved toward comprehensive AI regulation (the AI Act) and " +
    "has strong data protection rules under the GDPR. Chatbots likely face " +
    "transparency requirements, and automated decisions about individuals are " +
    "restricted. Exact obligations depend on the system's risk level.",
};

export async function callBaseline(): Promise<BaselineResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return FIXTURE;

  const client = new Anthropic({ apiKey: key });
  const msg = await client.messages.create({
    model: BASELINE_MODEL,
    max_tokens: 600,
    messages: [{ role: "user", content: PROMPT }],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return { text, model: msg.model ?? BASELINE_MODEL, fromFixture: false };
}
