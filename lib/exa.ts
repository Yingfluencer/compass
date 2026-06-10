// Exa client. We POST the brief's verified payloads (§5) verbatim to the REST
// endpoint so the request matches exactly what was tested — camelCase, nested
// `contents`, category "news". We handle BOTH response shapes:
//   - a single (slow, ~10s) JSON body, and
//   - an SSE stream of OpenAI-style chat-completion chunks (brief §2.1).
// We never assume an instant JSON response.

import type { ExaSearchPayload } from "./jurisdictions";
import type { JurisdictionExtract, RetrievedSource } from "./types";

const EXA_ENDPOINT = "https://api.exa.ai/search";
const DEEP_TIMEOUT_MS = 60_000; // deep calls take ~10s; give generous headroom.

export interface ExaRawResult {
  url: string;
  title?: string | null;
  publishedDate?: string | null;
  text?: string;
  highlights?: string[];
  highlightScores?: number[];
}

export interface ExaRetrieval {
  /** Structured synthesis matching the outputSchema (Exa: output.content). */
  extract: JurisdictionExtract;
  /** Retrieved sources (Exa: results[]) — the ground truth for validation. */
  sources: RetrievedSource[];
  /** Raw URLs present in this run's results — the allow-list for source_url. */
  retrievedUrls: string[];
}

function requireKey(): string {
  const key = process.env.EXA_API_KEY;
  if (!key) {
    throw new Error(
      "EXA_API_KEY is not set. Add it to .env (see .env.example)."
    );
  }
  return key;
}

/** Normalize Exa's results[] into our RetrievedSource shape. */
function toSources(results: ExaRawResult[]): RetrievedSource[] {
  return (results ?? []).map((r) => ({
    url: r.url,
    title: r.title ?? null,
    publishedDate: r.publishedDate ?? null,
    highlights: r.highlights ?? [],
    text: r.text,
  }));
}

/**
 * Reassemble an SSE stream of OpenAI-style chunks into a single content string.
 * Deep + outputSchema streams the JSON answer as incremental `delta.content`.
 */
async function reassembleSSE(body: ReadableStream<Uint8Array>): Promise<{
  content: string;
  results: ExaRawResult[];
}> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let results: ExaRawResult[] = [];

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // keep the trailing partial line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        // OpenAI-style delta content carries the structured JSON answer.
        const delta = json.choices?.[0]?.delta?.content;
        if (typeof delta === "string") content += delta;
        // Some Exa chunks carry results / output payloads alongside deltas.
        if (Array.isArray(json.results)) results = json.results;
        if (json.output?.content) {
          content =
            typeof json.output.content === "string"
              ? json.output.content
              : JSON.stringify(json.output.content);
        }
      } catch {
        // Non-JSON keep-alive or partial line — ignore.
      }
    }
  }
  return { content, results };
}

/** Parse `output.content` which may arrive as an object or a JSON string. */
function parseExtract(content: unknown): JurisdictionExtract {
  if (content && typeof content === "object") {
    return content as JurisdictionExtract;
  }
  if (typeof content === "string") {
    return JSON.parse(content) as JurisdictionExtract;
  }
  throw new Error("Exa returned no structured output (output.content empty).");
}

/**
 * Turn a raw Exa JSON body ({ results, output: { content } }) into an
 * ExaRetrieval. Shared by the live non-stream path and by fixture loading so
 * both are processed identically.
 */
export function processRawJson(json: {
  results?: ExaRawResult[];
  output?: { content?: unknown };
}): ExaRetrieval {
  const extract = parseExtract(json.output?.content);
  const sources = toSources(json.results ?? []);
  return { extract, sources, retrievedUrls: sources.map((s) => s.url) };
}

/**
 * Run one Exa deep + outputSchema retrieval. Returns the structured extract,
 * the retrieved sources, and the allow-list of retrieved URLs for validation.
 */
export async function runDeepSearch(
  payload: ExaSearchPayload
): Promise<ExaRetrieval> {
  const key = requireKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEEP_TIMEOUT_MS);

  try {
    const res = await fetch(EXA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Exa request failed (${res.status}): ${detail.slice(0, 500)}`);
    }

    const contentType = res.headers.get("content-type") ?? "";

    let extract: JurisdictionExtract;
    let rawResults: ExaRawResult[];

    if (contentType.includes("text/event-stream") && res.body) {
      const { content, results } = await reassembleSSE(res.body);
      extract = parseExtract(content);
      rawResults = results;
      const sources = toSources(rawResults);
      return { extract, sources, retrievedUrls: sources.map((s) => s.url) };
    }

    return processRawJson(await res.json());
  } finally {
    clearTimeout(timer);
  }
}
