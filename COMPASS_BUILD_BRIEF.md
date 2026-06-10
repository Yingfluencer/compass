# Compass — Cross-Border AI Regulation Delta Tracker

## Build brief for Claude Code

This is a hackathon project. Read this whole file before writing code. Decisions below are **locked** — do not re-debate them. If something is genuinely blocking, ask me; otherwise build.

---

## 1. What we are building

A tool that takes one AI use case and three jurisdictions, retrieves the **current, sourced** regulatory requirements for each using the Exa Search API, and shows them side by side in a comparison table that highlights conflicts. Every requirement displayed must carry a source URL retrieved from Exa. The model organizes and compares; it never asserts a regulatory fact without an Exa-retrieved source behind it. If there is no source, the cell reads "no current source found" rather than being filled by the model.

The core demo insight: the same AI chatbot is voluntary/soft-law in ASEAN, mixed in Singapore, and mandatory under the EU AI Act — and the EU AI Act's extraterritorial reach pulls an ASEAN-based company into mandatory compliance the moment it serves an EU user. "Geographically in ASEAN, legally under EU jurisdiction."

## 2. Read this FIRST — known gotchas that will break the build

1. **`outputSchema` + `type: "deep"` responses are SLOW (~10s each) and STREAM via SSE** (OpenAI-style chat-completion chunks), not a single JSON response. Handle the stream and reassemble. Do NOT write a naive one-shot fetch that assumes instant JSON.
2. **Do NOT use `category: "company"` or `category: "people"`** — they reject `startPublishedDate` and date filters with a 400 error. Use `category: "news"` so date filtering works.
3. **Cache retrieval results** for the demo. Live `deep` calls take ~10s × 3 jurisdictions = too slow to run cold on stage. Build a cache layer with a visible "last retrieved" timestamp. Never fake results; timestamp cached ones.
4. **Python SDK uses snake_case** (`include_domains`, `start_published_date`); **raw JSON API uses camelCase** (`includeDomains`, `startPublishedDate`). Pick one and stay consistent.
5. The model may invent source URLs. **Validate every `source_url` against the actual URLs returned in that jurisdiction's Exa results.** Drop any requirement whose source_url isn't in the retrieved set.

## 3. Locked scope

**Build:** one hardcoded use case, three jurisdictions, retrieve → structured-extract → comparison table → source drawer → one pre-created Exa Monitor (config + sample webhook payload, NOT a live-firing monitor).

**Do NOT build:** user accounts, multiple use cases, a live webhook receiver, settings pages, more than three jurisdictions, any "legal advice" framing. Surface requirements as "sourced regulatory requirements, not legal advice."

## 4. The hardcoded use case

> "A customer-facing generative AI chatbot that processes personal data and makes automated decisions affecting users."

Leave the input fields editable on the frontend to imply generality, but only this case needs to work flawlessly.

## 5. The three jurisdictions + verified Exa payloads

Each uses `type: "deep"`, `category: "news"`, `numResults: 8`, `startPublishedDate: "2024-01-01T00:00:00.000Z"`, and the shared outputSchema in section 6.

### ASEAN (HIGH RISK — test first, see fallback)
```json
{
  "query": "ASEAN guidelines on AI governance and ethics requirements for generative AI chatbots processing personal data automated decision-making",
  "type": "deep",
  "category": "news",
  "numResults": 8,
  "startPublishedDate": "2024-01-01T00:00:00.000Z",
  "includeDomains": ["asean.org"],
  "contents": { "text": { "maxCharacters": 3000 }, "highlights": { "numSentences": 3 } }
}
```
**Fallback if results are thin:** drop `includeDomains`, tighten query to `"ASEAN Guide on AI Governance and Ethics 2024 voluntary framework chatbot personal data"`, run full-web. Or use a reputable English law-firm/think-tank AI-regulation tracker domain, labeled in the UI as a secondary compilation source.

### Singapore (reliable)
```json
{
  "query": "Singapore Model AI Governance Framework AI Verify PDPA requirements generative AI chatbot personal data consent automated decisions",
  "type": "deep",
  "category": "news",
  "numResults": 8,
  "startPublishedDate": "2024-01-01T00:00:00.000Z",
  "includeDomains": ["imda.gov.sg", "pdpc.gov.sg"],
  "contents": { "text": { "maxCharacters": 3000 }, "highlights": { "numSentences": 3 } }
}
```

### EU (reliable)
```json
{
  "query": "EU AI Act risk classification transparency obligations GDPR automated decision-making generative AI chatbot extraterritorial scope",
  "type": "deep",
  "category": "news",
  "numResults": 8,
  "startPublishedDate": "2024-01-01T00:00:00.000Z",
  "includeDomains": ["digital-strategy.ec.europa.eu", "eur-lex.europa.eu"],
  "contents": { "text": { "maxCharacters": 3000 }, "highlights": { "numSentences": 3 } }
}
```
The `extraterritorial scope` term in the query is intentional — it feeds the demo's key reveal.

## 6. Shared outputSchema (identical across all three — required for the comparison table to align)

```json
{
  "type": "object",
  "properties": {
    "jurisdiction": { "type": "string", "description": "ASEAN, Singapore, or EU" },
    "legal_status": {
      "type": "string",
      "enum": ["voluntary", "mandatory", "mixed"],
      "description": "Whether requirements are legally binding, voluntary/advisory, or mixed"
    },
    "key_instruments": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Names of the specific frameworks, acts, or guidelines that apply"
    },
    "requirements": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "requirement": { "type": "string", "description": "A specific obligation for a generative AI chatbot processing personal data" },
          "binding": { "type": "boolean", "description": "True if legally enforceable, false if advisory" },
          "source_url": { "type": "string", "description": "URL of the supporting source. Must come from retrieved results, not generated." }
        },
        "required": ["requirement", "binding", "source_url"]
      }
    },
    "extraterritorial_reach": {
      "type": "string",
      "description": "Whether/how these rules apply to companies outside the jurisdiction serving its users"
    }
  },
  "required": ["jurisdiction", "legal_status", "key_instruments", "requirements", "extraterritorial_reach"]
}
```

## 7. Architecture

```
Frontend: input panel (use case + 3 jurisdictions, prefilled) → comparison table → source drawer → "watch" panel
        │
Backend (keep it thin — single service is fine):
  Step 1 RETRIEVE   — 3 Exa deep searches (section 5), one per jurisdiction
  Step 2 EXTRACT    — outputSchema returns structured JSON per jurisdiction (section 6)
  Step 3 VALIDATE   — drop any requirement whose source_url ∉ that run's retrieved URLs
  Step 4 COMPARE    — align the 3 JSON blobs into a table; flag legal_status differences
                       and surface extraterritorial_reach conflicts. NO fact without a source.
  Step 5 WATCH      — show a pre-created Exa Monitor config + a sample webhook payload (static)
```

The COMPARE step is the only place an LLM reasons over the data, and it is constrained: it may reorganize and flag, never invent a requirement or a source.

## 8. Frontend must-haves

- Comparison table: rows = requirement themes, columns = ASEAN / Singapore / EU, each cell shows binding/voluntary + a clickable source link.
- A `legal_status` row at top: voluntary (ASEAN) / mixed (SG) / mandatory (EU) — this visualizes the "governance maturity ladder."
- The extraterritorial-reach reveal visually emphasized (this is the demo's punchline).
- Source drawer: click any source link → see the Exa highlight snippet + URL + retrieved date.
- "Not legal advice" disclaimer, visible.

## 9. Setup

- Exa API key: dashboard.exa.ai/api-keys → create key. Store in `.env` as `EXA_API_KEY`. Never hardcode.
- `pip install exa-py` (Python) or `npm install exa-js` (JS). Use whichever you scaffold the app in.
- For the COMPARE step LLM call, use `ANTHROPIC_API_KEY` in `.env` too.

## 10. Build order (so a partial build still demos)

1. One working Exa deep+schema call for Singapore, validated, printing structured JSON. (Proves the pipeline.)
2. All three retrievals + the validation step.
3. Comparison table frontend.
4. Source drawer.
5. The naive-LLM-baseline side panel (ask a plain model the same question, show it's vague/dated — this is the contrast that sells Exa).
6. The Monitor "watch" panel (static config + sample payload).
7. Caching + "last retrieved" timestamps. Rehearse with cache on.

Stop at any point and you still have something demoable from step 3 onward.
