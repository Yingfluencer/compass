# Compass — Cross-Border AI Regulation Delta Tracker

Takes one AI use case and three jurisdictions (ASEAN · Singapore · EU), retrieves
the **current, sourced** regulatory requirements for each via the Exa Search API,
and shows them side by side — highlighting where they conflict and where the EU's
extraterritorial reach pulls an ASEAN-based company into mandatory compliance.

Every requirement carries a retrieved source URL. The model organises and
compares; it never asserts a regulatory fact without an Exa-retrieved source.
Requirements whose `source_url` wasn't actually retrieved are dropped. **Sourced
requirements, not legal advice.**

## Run it

```bash
npm install
cp .env.example .env      # then add EXA_API_KEY and ANTHROPIC_API_KEY
npm run dev               # http://localhost:3000  (serves from cache, falls back to fixtures)
```

Out of the box the app runs against bundled **fixtures** so it works with no keys.

## Pipeline (the five steps from the brief)

1. **RETRIEVE** — `lib/exa.ts` POSTs the verified deep + `outputSchema` payloads
   (`lib/jurisdictions.ts`), handling both a slow JSON body and an SSE stream.
2. **EXTRACT** — structured JSON per jurisdiction (shared schema, `lib/schema.ts`).
3. **VALIDATE** — `lib/validate.ts` drops any requirement whose `source_url` is
   not among that run's retrieved URLs.
4. **COMPARE** — `lib/compare.ts` aligns the three extracts into shared theme
   rows and flags binding/voluntary conflicts. Reorganises only — never invents.
5. **WATCH** — `lib/monitor.ts` + the watch panel: a static Exa Monitor config
   and sample webhook payload.

## Scripts

```bash
npm run step1   # validated Singapore deep+schema call -> structured JSON
npm run step2   # all three retrievals + validation
npm run seed    # LIVE Exa run for all three -> writes timestamped cache (needs EXA_API_KEY)
```

Add `-- --live` to `step1`/`step2` to hit the real Exa API instead of fixtures.

## Modes

`GET /api/compare?mode=` accepts `cache` (default — disk cache, falls back to
fixtures), `live` (real Exa call, writes through to cache), or `fixture`.

Run `npm run seed` once to populate `data/cache/` with genuine, timestamped Exa
results; the app then serves those instantly. Cached results are always
timestamped and never faked.
