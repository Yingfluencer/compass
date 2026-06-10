"use client";

import type { JurisdictionSummary } from "@/lib/compare";
import { JURISDICTION_LABEL } from "./status";

/**
 * The demo punchline (brief §8): the EU AI Act + GDPR reach extraterritorially,
 * so an ASEAN-based company serving one EU user is pulled into mandatory EU
 * compliance. "Geographically in ASEAN, legally under EU jurisdiction."
 */
export function ExtraterritorialReveal({
  jurisdictions,
  onSourceClick,
}: {
  jurisdictions: JurisdictionSummary[];
  onSourceClick?: (url: string) => void;
}) {
  void onSourceClick;
  return (
    <section className="overflow-hidden rounded-xl border border-orange-300 bg-gradient-to-br from-orange-50 to-rose-50 shadow-sm">
      <div className="border-b border-orange-200 bg-orange-100/60 px-5 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-orange-900">
          Extraterritorial reach — the cross-border catch
        </h2>
      </div>

      <div className="px-5 py-4">
        <p className="text-lg font-semibold leading-snug text-slate-800">
          An ASEAN-based company serving a single EU user is pulled into{" "}
          <span className="bg-orange-200/70 px-1 font-bold text-orange-900">
            mandatory EU compliance
          </span>
          .
        </p>
        <p className="mt-1 font-mono text-sm text-orange-800">
          Geographically in ASEAN → legally under EU jurisdiction.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {jurisdictions.map((j) => (
            <div
              key={j.id}
              className={`rounded-lg border p-3 ${
                j.id === "EU"
                  ? "border-orange-300 bg-white ring-1 ring-orange-200"
                  : "border-slate-200 bg-white/70"
              }`}
            >
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {JURISDICTION_LABEL[j.id]}
              </div>
              <p className="text-sm leading-snug text-slate-700">
                {j.extraterritorial_reach}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
