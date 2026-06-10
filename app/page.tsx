"use client";

import { useCallback, useEffect, useState } from "react";
import type { Comparison } from "@/lib/compare";
import type { AgentTrace, Synthesis } from "@/lib/types";
import { InputPanel } from "@/components/InputPanel";
import { AgentTracePanel } from "@/components/AgentTracePanel";
import { MaturityLadder } from "@/components/MaturityLadder";
import { ComparisonTable } from "@/components/ComparisonTable";
import { ExtraterritorialReveal } from "@/components/ExtraterritorialReveal";
import { SourceDrawer } from "@/components/SourceDrawer";
import { BaselinePanel } from "@/components/BaselinePanel";
import { WatchPanel } from "@/components/WatchPanel";

export default function Home() {
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [trace, setTrace] = useState<AgentTrace | null>(null);
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [mode, setMode] = useState<string>("cache");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openUrl, setOpenUrl] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/compare");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setComparison(data.comparison as Comparison);
      setTrace(data.trace as AgentTrace);
      setSynthesis(data.synthesis as Synthesis);
      setMode(data.mode as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  const onSourceClick = (url: string) => setOpenUrl(url);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold tracking-tight text-sky-600">
            ◆ COMPASS
          </span>
          <span className="text-xs text-slate-400">
            Cross-Border AI Regulation Delta Tracker
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          The same AI chatbot, three legal realities
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Current, sourced regulatory requirements retrieved per jurisdiction.
          Every requirement carries a source link; unsupported claims are
          dropped. <span className="font-semibold">Sourced requirements, not legal advice.</span>
        </p>
      </header>

      <div className="space-y-6">
        <InputPanel loading={loading} onRun={run} />

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {comparison && (
          <>
            {trace && synthesis && (
              <AgentTracePanel trace={trace} synthesis={synthesis} mode={mode} />
            )}

            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Governance maturity ladder
              </h2>
              <MaturityLadder jurisdictions={comparison.jurisdictions} />
            </section>

            <ExtraterritorialReveal
              jurisdictions={comparison.jurisdictions}
              onSourceClick={onSourceClick}
            />

            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Requirement comparison
              </h2>
              <ComparisonTable
                comparison={comparison}
                onSourceClick={onSourceClick}
              />
            </section>

            <BaselinePanel />

            <WatchPanel />
          </>
        )}

        {loading && !comparison && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            Retrieving sourced requirements…
          </div>
        )}
      </div>

      <SourceDrawer
        url={openUrl}
        source={openUrl ? comparison?.sourcesByUrl[openUrl] ?? null : null}
        retrievedAt={openUrl ? comparison?.retrievedAtByUrl[openUrl] ?? null : null}
        onClose={() => setOpenUrl(null)}
      />

      <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-400">
        Compass surfaces sourced regulatory requirements for orientation only —
        this is <span className="font-semibold">not legal advice</span>.
        Requirements are shown only when backed by a retrieved source.
      </footer>
    </main>
  );
}
