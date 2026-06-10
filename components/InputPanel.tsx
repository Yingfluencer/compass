"use client";

import { useState } from "react";

export const DEFAULT_USE_CASE =
  "A customer-facing generative AI chatbot that processes personal data and makes automated decisions affecting users.";

export const DEFAULT_JURISDICTIONS = ["ASEAN", "Singapore", "EU"];

/**
 * Input panel (brief §4/§8). Fields are editable to imply generality, but only
 * the hardcoded use case + three jurisdictions are wired to work flawlessly.
 */
export function InputPanel({
  loading,
  onRun,
}: {
  loading: boolean;
  onRun: () => void;
}) {
  const [useCase, setUseCase] = useState(DEFAULT_USE_CASE);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
        AI use case
      </label>
      <textarea
        value={useCase}
        onChange={(e) => setUseCase(e.target.value)}
        rows={2}
        className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
      />

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Jurisdictions
          </label>
          <div className="mt-1.5 flex gap-2">
            {DEFAULT_JURISDICTIONS.map((j) => (
              <input
                key={j}
                defaultValue={j}
                className="w-32 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onRun}
          disabled={loading}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Retrieving…" : "Compare requirements"}
        </button>
      </div>
    </div>
  );
}
