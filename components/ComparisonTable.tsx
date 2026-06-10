"use client";

import type { Comparison, ThemeRow } from "@/lib/compare";
import type { JurisdictionId, Requirement } from "@/lib/types";
import { STATUS_STYLE, JURISDICTION_LABEL } from "./status";

const COLS: JurisdictionId[] = ["ASEAN", "Singapore", "EU"];

function BindingBadge({ binding }: { binding: boolean }) {
  return binding ? (
    <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-800">
      Binding
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
      Advisory
    </span>
  );
}

function Cell({
  reqs,
  onSourceClick,
}: {
  reqs: Requirement[];
  onSourceClick: (url: string) => void;
}) {
  if (reqs.length === 0) {
    return (
      <td className="border-t border-slate-100 p-3 align-top">
        <span className="text-xs italic text-slate-400">
          no current source found
        </span>
      </td>
    );
  }
  return (
    <td className="border-t border-slate-100 p-3 align-top">
      <ul className="space-y-2.5">
        {reqs.map((r, i) => (
          <li key={i} className="text-sm leading-snug text-slate-700">
            <div className="mb-1 flex items-center gap-2">
              <BindingBadge binding={r.binding} />
            </div>
            <span>{r.requirement}</span>{" "}
            <button
              type="button"
              onClick={() => onSourceClick(r.source_url)}
              className="font-mono text-xs text-sky-600 underline decoration-dotted underline-offset-2 hover:text-sky-800"
            >
              source
            </button>
          </li>
        ))}
      </ul>
    </td>
  );
}

export function ComparisonTable({
  comparison,
  onSourceClick,
}: {
  comparison: Comparison;
  onSourceClick: (url: string) => void;
}) {
  const { jurisdictions, rows } = comparison;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="w-48 p-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Requirement theme
            </th>
            {COLS.map((id) => {
              const j = jurisdictions.find((x) => x.id === id)!;
              const s = STATUS_STYLE[j.legal_status];
              return (
                <th key={id} className="p-3 text-left align-bottom">
                  <div className="text-sm font-bold text-slate-800">
                    {JURISDICTION_LABEL[id]}
                  </div>
                  <div
                    className={`mt-1 inline-flex items-center gap-1.5 rounded-full border ${s.border} ${s.bg} px-2 py-0.5`}
                  >
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                    <span className={`text-[11px] font-semibold ${s.text}`}>
                      {s.label}
                    </span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row: ThemeRow) => (
            <tr key={row.theme} className="hover:bg-slate-50/50">
              <th className="w-48 border-t border-slate-100 p-3 text-left align-top">
                <div className="text-sm font-semibold text-slate-700">
                  {row.theme}
                </div>
                {row.hasConflict && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600">
                    ⚠ status conflict
                  </span>
                )}
              </th>
              {COLS.map((id) => (
                <Cell
                  key={id}
                  reqs={row.cells[id]}
                  onSourceClick={onSourceClick}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
