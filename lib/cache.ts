// Run-level cache (brief §2.3 / §2A). Live agent runs take ~10s of Exa calls plus
// a synthesis call — too slow to run cold on stage. We persist the whole run
// (grounded results + agent trace + synthesis) to disk with timestamps so the
// staged demo replays instantly and IDENTICALLY. Cached runs are always
// timestamped and never faked; the UI marks them as replayed.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type {
  AgentTrace,
  JurisdictionResult,
  Synthesis,
} from "./types";

export interface CachedRun {
  results: JurisdictionResult[];
  trace: AgentTrace;
  synthesis: Synthesis;
}

const CACHE_DIR = resolve(process.cwd(), "data", "cache");
const RUN_PATH = resolve(CACHE_DIR, "run.json");

function ensureDir() {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
}

/** Read the cached run, or null if none. Marks results/trace as replayed. */
export function readRun(): CachedRun | null {
  if (!existsSync(RUN_PATH)) return null;
  try {
    const run = JSON.parse(readFileSync(RUN_PATH, "utf8")) as CachedRun;
    return {
      results: run.results.map((r) => ({ ...r, fromCache: true })),
      trace: { ...run.trace, replayed: true },
      synthesis: run.synthesis,
    };
  } catch {
    return null;
  }
}

/** Write a freshly-executed run to the cache (write-through after a live run). */
export function writeRun(run: CachedRun): void {
  ensureDir();
  const toStore: CachedRun = {
    results: run.results.map((r) => ({ ...r, fromCache: false })),
    trace: { ...run.trace, replayed: false },
    synthesis: run.synthesis,
  };
  writeFileSync(RUN_PATH, JSON.stringify(toStore, null, 2), "utf8");
}

export function hasCachedRun(): boolean {
  return existsSync(RUN_PATH);
}
