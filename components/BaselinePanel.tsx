"use client";

import { useState } from "react";

interface BaselineResult {
  text: string;
  model: string;
  fromFixture: boolean;
}

/**
 * Naive-LLM baseline panel (brief §8/§10.5). Shows a plain model's answer to the
 * same question with NO retrieval — fluent but unsourced and undated — beside
 * the sourced table. This contrast is what sells Exa retrieval.
 */
export function BaselinePanel() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<BaselineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !result && !loading) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/baseline");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Request failed");
        setResult(data as BaselineResult);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <h2 className="text-sm font-bold text-slate-800">
            Compare with a plain LLM answer{" "}
            <span className="font-normal text-slate-400">(no retrieval)</span>
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Same question, asked from training data only — no sources, no dates.
          </p>
        </div>
        <span className="font-mono text-xs text-slate-400">
          {open ? "▲ hide" : "▼ show"}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-200 px-5 py-4">
          {loading && (
            <p className="text-sm text-slate-400">Asking the plain model…</p>
          )}
          {error && (
            <p className="text-sm text-rose-600">{error}</p>
          )}
          {result && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* The plain answer */}
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                    plain LLM · no retrieval
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {result.model}
                  </span>
                  {result.fromFixture && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      sample — add ANTHROPIC_API_KEY for a live call
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-sm leading-snug text-slate-700">
                  {result.text.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>

              {/* Why the sourced table wins */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
                <span className="rounded-full bg-emerald-200/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                  Compass · Exa-sourced
                </span>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  <li className="flex gap-2">
                    <span className="text-emerald-600">✓</span> Every requirement
                    links to a retrieved source URL.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600">✓</span> Each source shows
                    a published + retrieved date.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600">✓</span> Invented claims are
                    dropped — no source, no requirement.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-rose-500">✗</span>{" "}
                    <span className="text-slate-500">
                      The plain answer has none of these: no links, no dates,
                      no way to verify or detect when a rule has changed.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
