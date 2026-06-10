# Compass — Cross-Border AI Regulation Delta Tracker

## Build brief for Claude Code — v2 (agentic framing)

> **NOTE (drafted by Claude, 2026-06-09):** This is a *proposed* agentic revision.
> The original `COMPASS_BUILD_BRIEF.md` is preserved unchanged. Sections 1, 7, 8,
> and 10 are rewritten and a new **section 2A** is added; sections 2, 3, 4, 5, 6,
> and 9 are carried over verbatim because they are locked technical decisions.
> Review section 2A especially — it encodes my assumption of what "the agent loop"
> means. Adjust to match your intent, then rename this file to replace the brief.

This is a hackathon project. Read this whole file before writing code. Decisions
below are **locked** — do not re-debate them. If something is genuinely blocking,
ask; otherwise build.

---

## 1. What we are building  *(revised — agentic)*

An **agent** that takes one AI use case and three jurisdictions and produces a
**current, sourced** side-by-side comparison of their regulatory requirements,
highlighting conflicts. The agent does not run a fixed script — it **plans,
retrieves with the Exa Search API as a tool, inspects what came back, and decides
its own next move**: if a jurisdiction's results are thin or off-target, it
reformulates the query and tries again; when a jurisdiction is adequately
grounded, it stops searching it. Only once every jurisdiction has sufficient
sourced coverage (or the iteration budget is spent) does it produce the
comparison.

Every requirement displayed must carry a source URL retrieved from Exa. The agent
organizes and compares; it never asserts a regulatory fact without an
Exa-retrieved source behind it. If there is no source, the cell reads "no current
source found" rather than being filled by the model. The agent's loop does not
relax this rule — more iterations mean *more retrieval*, never more invention.

The core demo insight is unchanged: the same AI chatbot is voluntary/soft-law in
ASEAN, mixed in Singapore, and mandatory under the EU AI Act — and the EU AI
Act's extraterritorial reach pulls an ASEAN-based company into mandatory
compliance the moment it serves an EU user. "Geographically in ASEAN, legally
under EU jurisdiction." The agentic framing makes a second point demoable: you can
**watch the agent decide** how to source each jurisdiction, and see it recover
from a thin ASEAN result on its own.

## 2. Read this FIRST — known gotchas that will break the build  *(unchanged)*

1. **`outputSchema` + `type: "deep"` responses are SLOW (~10s each) and STREAM via SSE** (OpenAI-style chat-completion chunks), not a single JSON response. Handle the stream and reassemble. Do NOT write a naive one-shot fetch that assumes instant JSON.
2. **Do NOT use `category: "company"` or `category: "people"`** — they reject `startPublishedDate` and date filters with a 400 error. Use `category: "news"` so date filtering works.
3. **Cache retrieval results** for the demo. Live `deep` calls take ~10s × 3 jurisdictions = too slow to run cold on stage. Build a cache layer with a visible "last retrieved" timestamp. Never fake results; timestamp cached ones.
4. **Python SDK uses snake_case** (`include_domains`, `start_published_date`); **raw JSON API uses camelCase** (`includeDomains`, `startPublishedDate`). Pick one and stay consistent.
5. The model may invent source URLs. **Validate every `source_url` against the actual URLs returned in that jurisdiction's Exa results.** Drop any requirement whose source_url isn't in the retrieved set.

## 2A. The agent loop  *(new)*

The retrieval stage is an **agent loop**, not a straight-line pipeline. The agent
is given the use case, the three jurisdictions, and a small set of tools; it
decides the order and number of calls.

**Tools the agent may call:**
- `exa_deep_search(jurisdiction, query?, dropDomainFilter?)` — runs one Exa deep +
  `outputSchema` retrieval for a jurisdiction. Defaults to that jurisdiction's
  locked payload (§5); the agent may override the `query` or drop the
  `includeDomains` filter to widen the search. Returns the structured extract +
  the retrieved source URLs.
- `validate_sources(jurisdiction)` — drops any requirement whose `source_url` is
  not in that jurisdiction's retrieved set (§2.5). Returns kept vs dropped counts.
  The agent MUST call this before considering a jurisdiction grounded.
- `assess_coverage(jurisdiction)` — returns a simple sufficiency verdict
  (sourced-requirement count, whether `legal_status` and `extraterritorial_reach`
  are populated, number of distinct source domains).

**The loop (per run):**
1. **PLAN** — pick the next jurisdiction/action. Cheap/reliable jurisdictions
   (Singapore, EU) first; ASEAN is known-risky.
2. **ACT** — call `exa_deep_search`.
3. **OBSERVE** — call `validate_sources`, then `assess_coverage`.
4. **REFLECT** — if coverage is thin: reformulate (tighten/loosen the query, drop
   the domain filter per the ASEAN fallback in §5) and loop back to ACT for that
   jurisdiction. If sufficient: mark it grounded.
5. **STOP** when all three jurisdictions are grounded **or** the budget is hit.
6. **FINALIZE (post-loop, the agent's closing actions):**
   a. **COMPARE / SYNTHESIZE** — a single constrained **Anthropic** call reasons
      *across* the three grounded extracts: aligns them, flags `legal_status`
      conflicts, and writes the extraterritorial-reach narrative. It may
      reorganize and flag, never invent a requirement or a source. (This is a
      distinct post-loop step — it is NOT dropped.)
   b. **WATCH** — as its final action the agent **sets up an Exa Monitor** over the
      sources so the comparison stays current, recorded as the last trace entry.
      Static for the demo (config + sample webhook payload; no live receiver), but
      framed and shown as an action the agent took.

**Hard constraints (non-negotiable):**
- **Max iterations:** cap total `exa_deep_search` calls (suggest 6 — i.e. up to
  one retry per jurisdiction). Surface the cap in the UI; never loop unbounded.
- **Grounding is absolute:** more iterations buy more *retrieval*, never invented
  facts. The §2.5 validation gate applies to every iteration's output.
- **Determinism for demo:** the loop must be re-runnable from cache so the staged
  demo is instant and identical. Log the agent's decisions to the cache too.
- **Visible reasoning:** every PLAN/ACT/OBSERVE/REFLECT step is recorded as a
  trace entry for the UI (§8). No hidden actions.

**Decision points are swappable (locked decision):** build the loop as a
**deterministic controller** now — it makes the PLAN/REFLECT/sufficiency
decisions in code and records a trace. But each decision point is behind a small
interface so it can be replaced by a real LLM call later. The priority upgrade
point is the **sufficiency judgment** in OBSERVE/REFLECT (`assess_coverage` →
"is my evidence sufficient?") — that is the most defensible and most visible point
of real agency. If time remains at the end, swap *that* judgment for a genuine
Anthropic call first. The grounding/validation gate (§2.5) is enforced in code
regardless, so no model — deterministic or LLM — can bypass it.

## 3. Locked scope  *(unchanged)*

**Build:** one hardcoded use case, three jurisdictions, the agent loop (retrieve →
validate → assess → re-query) → comparison table → source drawer → agent-trace
panel → one pre-created Exa Monitor (config + sample webhook payload, NOT a
live-firing monitor).

**Do NOT build:** user accounts, multiple use cases, a live webhook receiver,
settings pages, more than three jurisdictions, any "legal advice" framing. Surface
requirements as "sourced regulatory requirements, not legal advice." Do NOT give
the agent destructive tools or any tool that writes outside the cache.

## 4. The hardcoded use case  *(unchanged)*

> "A customer-facing generative AI chatbot that processes personal data and makes automated decisions affecting users."

Leave the input fields editable on the frontend to imply generality, but only this
case needs to work flawlessly.

## 5. The three jurisdictions + verified Exa payloads  *(unchanged)*

Each uses `type: "deep"`, `category: "news"`, `numResults: 8`, `startPublishedDate: "2024-01-01T00:00:00.000Z"`, and the shared outputSchema in section 6. These are the agent's **default** payloads; the agent may reformulate `query` / drop `includeDomains` within the loop (§2A).

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
**Fallback if results are thin:** drop `includeDomains`, tighten query to `"ASEAN Guide on AI Governance and Ethics 2024 voluntary framework chatbot personal data"`, run full-web. Or use a reputable English law-firm/think-tank AI-regulation tracker domain, labeled in the UI as a secondary compilation source. *(In v2 this fallback is exactly what the agent triggers itself in the REFLECT step.)*

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

## 6. Shared outputSchema (identical across all three — required for the comparison table to align)  *(unchanged)*

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

## 7. Architecture  *(revised — agentic)*

```
Frontend: input panel (use case + 3 jurisdictions, prefilled)
        → AGENT TRACE panel (the loop's decisions, live/replayed)
        → comparison table → source drawer → "watch" panel
        │
Backend (keep it thin — single service is fine):
  AGENT LOOP (section 2A), per jurisdiction, bounded by an iteration budget:
    PLAN     — choose next jurisdiction/action
    ACT      — exa_deep_search(jurisdiction[, query][, dropDomainFilter])   ← Exa tool
    OBSERVE  — validate_sources()  (drop source_url ∉ retrieved set)
             — assess_coverage()   (enough sourced requirements? status filled?)
    REFLECT  — thin? reformulate & loop. sufficient? mark grounded.
  → STOP when all grounded or budget exhausted
  COMPARE    — align the 3 grounded extracts into a table; flag legal_status
               differences and surface extraterritorial_reach conflicts.
               Runs ONCE, after the loop. NO fact without a source.
  WATCH      — pre-created Exa Monitor config + a sample webhook payload (static)
```

Implementation note: the loop can be a real tool-calling model loop **or** a
deterministic controller that makes the same PLAN/REFLECT decisions in code and
records an identical trace. Either is acceptable for the demo as long as (a) the
decisions and re-queries are real and visible, and (b) the run is replayable from
cache. The grounding/validation gate (§2.5) is enforced in code regardless, so the
model can never bypass it.

## 8. Frontend must-haves  *(revised)*

- **Agent-trace panel (new):** show the loop's steps in order — for each:
  jurisdiction, action (query used, whether the domain filter was dropped),
  results count, kept/dropped after validation, and the REFLECT verdict
  (grounded / re-querying). Make a thin→fallback→grounded recovery (ASEAN) clearly
  legible — this is the agentic demo beat. Mark whether the trace is live or
  replayed from cache.
- Comparison table: rows = requirement themes, columns = ASEAN / Singapore / EU,
  each cell shows binding/voluntary + a clickable source link.
- A `legal_status` row at top: voluntary (ASEAN) / mixed (SG) / mandatory (EU) —
  the "governance maturity ladder."
- The extraterritorial-reach reveal visually emphasized (the demo's punchline).
- Source drawer: click any source link → Exa highlight snippet + URL + retrieved date.
- Iteration-budget indicator: show "N of MAX retrievals used" so the bound is visible.
- "Not legal advice" disclaimer, visible.

## 9. Setup  *(unchanged)*

- Exa API key: dashboard.exa.ai/api-keys → create key. Store in `.env` as `EXA_API_KEY`. Never hardcode.
- `pip install exa-py` (Python) or `npm install exa-js` (JS). Use whichever you scaffold the app in.
- For the COMPARE step (and, if used, the agent's tool-calling loop) use `ANTHROPIC_API_KEY` in `.env` too.

## 10. Build order (so a partial build still demos)  *(revised — agentic)*

1. One working Exa deep+schema call for Singapore, validated, printing structured JSON. (Proves the tool the agent will call.) — **already built; keep.**
2. The three retrieval payloads + the validation step, callable as **tools** (`exa_deep_search`, `validate_sources`). — **mostly built; refactor into a tool surface.**
3. The **agent loop** (§2A) wrapping those tools: PLAN/ACT/OBSERVE/REFLECT with the iteration budget, producing both the grounded extracts and a decision trace. (The new core.)
4. Comparison table frontend (fed by the loop's grounded output).
5. Agent-trace panel + source drawer.
6. The naive-LLM-baseline side panel (ask a plain model the same question, show it's vague/dated — the contrast that sells Exa *and* the agent).
7. The Monitor "watch" panel (static config + sample payload).
8. Caching + "last retrieved" timestamps, including a cached/replayable agent trace. Rehearse with cache on.

Stop at any point and you still have something demoable from step 4 onward.
