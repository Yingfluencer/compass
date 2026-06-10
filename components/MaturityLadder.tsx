"use client";

import type { JurisdictionSummary } from "@/lib/compare";
import { STATUS_STYLE, JURISDICTION_LABEL } from "./status";

function formatRetrieved(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The "governance maturity ladder" (brief §8): legal_status across the three
 * jurisdictions, left (voluntary) to right (mandatory).
 */
export function MaturityLadder({
  jurisdictions,
}: {
  jurisdictions: JurisdictionSummary[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {jurisdictions.map((j, i) => {
        const s = STATUS_STYLE[j.legal_status];
        return (
          <div
            key={j.id}
            className={`relative rounded-xl border ${s.border} ${s.bg} p-4`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold tracking-wide text-slate-600">
                {JURISDICTION_LABEL[j.id] ?? j.id}
              </span>
              <span className="font-mono text-xs text-slate-400">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
              <span className={`text-lg font-bold ${s.text}`}>{s.label}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {j.key_instruments.length} instrument
              {j.key_instruments.length === 1 ? "" : "s"} ·{" "}
              {j.sourceNote ? "secondary source" : "primary sources"}
            </p>
            <div className="mt-2 flex items-center gap-1.5 border-t border-black/5 pt-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  j.fromCache ? "bg-slate-400" : "bg-sky-500"
                }`}
              />
              <span className="font-mono text-[10px] text-slate-400">
                {j.fromCache ? "cached" : "live"} · retrieved{" "}
                {formatRetrieved(j.retrievedAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
