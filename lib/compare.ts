// COMPARE (brief §7, Step 4): align the three validated extracts into a single
// table. Rows = requirement themes, columns = ASEAN / Singapore / EU. This step
// only REORGANISES already-validated, source-backed requirements into theme
// buckets — it never invents a requirement or a source. Empty cells become
// "no current source found" in the UI.

import type {
  JurisdictionId,
  JurisdictionResult,
  LegalStatus,
  Requirement,
  RetrievedSource,
} from "./types";

export interface ThemeRow {
  theme: string;
  /** Requirements per jurisdiction for this theme (may be empty). */
  cells: Record<JurisdictionId, Requirement[]>;
  /** True when binding-ness differs across the jurisdictions that have an entry. */
  hasConflict: boolean;
}

export interface JurisdictionSummary {
  id: JurisdictionId;
  legal_status: LegalStatus;
  key_instruments: string[];
  extraterritorial_reach: string;
  retrievedAt: string;
  fromCache: boolean;
  sourceNote?: string;
  droppedCount: number;
}

export interface Comparison {
  jurisdictions: JurisdictionSummary[];
  rows: ThemeRow[];
  /** URL -> retrieved source (Exa highlight, title, date) for the source drawer. */
  sourcesByUrl: Record<string, RetrievedSource>;
  /** URL -> when its jurisdiction was retrieved (for the drawer's date stamp). */
  retrievedAtByUrl: Record<string, string>;
}

const JURISDICTION_ORDER: JurisdictionId[] = ["ASEAN", "Singapore", "EU"];

// Ordered theme buckets. A requirement joins the FIRST theme whose pattern
// matches, so the most specific themes are listed before the broad ones (e.g.
// "automated decision" must win over the generic "inform" in Transparency).
const THEMES: { theme: string; pattern: RegExp }[] = [
  { theme: "Automated-decision rights", pattern: /automated decision|solely automated|profiling/i },
  { theme: "AI-generated content marking", pattern: /generated content|machine-readable|marked|watermark/i },
  { theme: "Risk management, conformity & registration", pattern: /conformity|risk management|high-risk|register|registration/i },
  { theme: "Human oversight", pattern: /human (oversight|involvement|review)|oversight/i },
  { theme: "Consent & personal data", pattern: /consent|personal data|pdpa|data protection|gdpr/i },
  { theme: "Fairness, explainability & accountability", pattern: /fairness|explainab|accountab|equity|human-centric/i },
  { theme: "Transparency / AI disclosure", pattern: /transparen|disclos|inform(ed)?|aware|interact/i },
];

const OTHER_THEME = "Other obligations";

// Readability order for table rows (independent of match specificity above).
const DISPLAY_ORDER = [
  "Transparency / AI disclosure",
  "Consent & personal data",
  "Automated-decision rights",
  "Human oversight",
  "AI-generated content marking",
  "Fairness, explainability & accountability",
  "Risk management, conformity & registration",
  OTHER_THEME,
];

function classify(req: Requirement): string {
  for (const t of THEMES) {
    if (t.pattern.test(req.requirement)) return t.theme;
  }
  return OTHER_THEME;
}

function emptyCells(): Record<JurisdictionId, Requirement[]> {
  return { ASEAN: [], Singapore: [], EU: [] };
}

/** Build the aligned comparison table from the per-jurisdiction results. */
export function buildComparison(results: JurisdictionResult[]): Comparison {
  const byId = new Map<JurisdictionId, JurisdictionResult>();
  for (const r of results) byId.set(r.id, r);

  // Bucket every requirement into (theme -> jurisdiction -> requirements).
  const buckets = new Map<string, Record<JurisdictionId, Requirement[]>>();
  for (const id of JURISDICTION_ORDER) {
    const result = byId.get(id);
    if (!result) continue;
    for (const req of result.extract.requirements) {
      const theme = classify(req);
      if (!buckets.has(theme)) buckets.set(theme, emptyCells());
      buckets.get(theme)![id].push(req);
    }
  }

  // Order rows for readability (DISPLAY_ORDER), skipping empty themes.
  const rows: ThemeRow[] = [];
  for (const theme of DISPLAY_ORDER) {
    const cells = buckets.get(theme);
    if (!cells) continue;
    const present = JURISDICTION_ORDER.filter((id) => cells[id].length > 0);
    if (present.length === 0) continue;
    // Conflict = the jurisdictions that DO address this theme disagree on binding.
    const bindings = new Set(
      present.map((id) => cells[id].some((r) => r.binding))
    );
    rows.push({ theme, cells, hasConflict: bindings.size > 1 });
  }

  const jurisdictions: JurisdictionSummary[] = JURISDICTION_ORDER.map((id) => {
    const r = byId.get(id)!;
    return {
      id,
      legal_status: r.extract.legal_status,
      key_instruments: r.extract.key_instruments,
      extraterritorial_reach: r.extract.extraterritorial_reach,
      retrievedAt: r.retrievedAt,
      fromCache: r.fromCache,
      sourceNote: r.sourceNote,
      droppedCount: r.droppedCount,
    };
  });

  const sourcesByUrl: Record<string, RetrievedSource> = {};
  const retrievedAtByUrl: Record<string, string> = {};
  for (const r of results) {
    for (const s of r.sources) {
      sourcesByUrl[s.url] = s;
      retrievedAtByUrl[s.url] = r.retrievedAt;
    }
  }

  return { jurisdictions, rows, sourcesByUrl, retrievedAtByUrl };
}
