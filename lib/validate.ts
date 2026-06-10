// VALIDATE (brief Step 3 / §2.5): the model may invent source URLs. We drop any
// requirement whose source_url is not among the URLs actually retrieved in that
// jurisdiction's run. No fact survives without a real retrieved source behind it.

import type { JurisdictionExtract, Requirement } from "./types";

/** Normalize a URL for comparison (ignore trailing slash, fragment, case-of-host). */
function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    let s = u.toString();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s.toLowerCase();
  } catch {
    return raw.trim().toLowerCase().replace(/\/$/, "");
  }
}

export interface ValidationOutcome {
  extract: JurisdictionExtract;
  kept: Requirement[];
  dropped: Requirement[];
}

/**
 * Returns the extract with only source-backed requirements, plus the list of
 * dropped (invented-source) requirements for transparency/logging.
 */
export function validateExtract(
  extract: JurisdictionExtract,
  retrievedUrls: string[]
): ValidationOutcome {
  const allow = new Set(retrievedUrls.map(normalizeUrl));

  const kept: Requirement[] = [];
  const dropped: Requirement[] = [];

  for (const req of extract.requirements ?? []) {
    const ok = !!req.source_url && allow.has(normalizeUrl(req.source_url));
    (ok ? kept : dropped).push(req);
  }

  return {
    extract: { ...extract, requirements: kept },
    kept,
    dropped,
  };
}
