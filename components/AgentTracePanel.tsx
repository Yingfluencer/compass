"use client";

import { useState } from "react";
import type { AgentTrace, Synthesis, TraceStep } from "@/lib/types";

// Group consecutive trace steps by jurisdiction so each jurisdiction's loop
// (and the final FINALIZE block) renders as one section, in execution order.
function groupSteps(steps: TraceStep[]): { key: string; steps: TraceStep[] }[] {
  const groups: { key: string; steps: TraceStep[] }[] = [];
  for (const s of steps) {
    const last = groups[groups.length - 1];
    if (last && last.key === s.jurisdiction) last.steps.push(s);
    else groups.push({ key: s.jurisdiction, steps: [s] });
  }
  return groups;
}

const PHASE_STYLE: Record<string, string> = {
  PLAN: "bg-slate-100 text-slate-600",
  ACT: "bg-sky-100 text-sky-800",
  OBSERVE: "bg-indigo-100 text-indigo-800",
  REFLECT: "bg-amber-100 text-amber-900",
  FINALIZE: "bg-emerald-100 text-emerald-800",
};

function attemptsFor(steps: TraceStep[]): number {
  return steps.filter((s) => s.phase === "ACT").length;
}

function StepRow({ step }: { step: TraceStep }) {
  const insufficient = step.verdict === "insufficient";
  const grounded = step.verdict === "grounded" || step.verdict === "sufficient";

  return (
    <div
      className={`rounded-md border px-3 py-2 ${
        insufficient
          ? "border-rose-200 bg-rose-50"
          : grounded
            ? "border-emerald-200 bg-emerald-50"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
            PHASE_STYLE[step.phase] ?? "bg-slate-100 text-slate-600"
          }`}
        >
          {step.phase}
        </span>
        {step.iteration > 0 && (
          <span className="font-mono text-[10px] text-slate-400">
            retrieval #{step.iteration}
          </span>
        )}
        <span className="text-sm font-medium text-slate-800">{step.action}</span>
        {step.verdict && (
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              insufficient
                ? "bg-rose-200 text-rose-900"
                : "bg-emerald-200 text-emerald-900"
            }`}
          >
            {step.verdict}
          </span>
        )}
      </div>

      {/* The actual tool inputs/outputs — the evidence this is verdict-driven. */}
      {(step.query || step.resultsCount !== undefined || step.kept !== undefined) && (
        <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-slate-500">
          {step.query && (
            <div className="w-full">
              <span className="text-slate-400">query:</span>{" "}
              <span className="text-slate-600">“{step.query}”</span>
            </div>
          )}
          {step.dropDomainFilter !== undefined && (
            <div>
              <span className="text-slate-400">domain filter:</span>{" "}
              <span className={step.dropDomainFilter ? "text-orange-700" : "text-slate-600"}>
                {step.dropDomainFilter ? "DROPPED (full web)" : "on (official domains)"}
              </span>
            </div>
          )}
          {step.resultsCount !== undefined && (
            <div>
              <span className="text-slate-400">results:</span> {step.resultsCount}
            </div>
          )}
          {step.kept !== undefined && (
            <div>
              <span className="text-slate-400">kept:</span> {step.kept} ·{" "}
              <span className="text-slate-400">dropped:</span> {step.dropped}
            </div>
          )}
        </dl>
      )}

      {step.reason && (
        <p className="mt-1 text-xs leading-snug text-slate-600">{step.reason}</p>
      )}
    </div>
  );
}

function BudgetMeter({ used, max }: { used: number; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[11px] text-slate-500">
        {used} of {max} retrievals
      </span>
      <div className="flex gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-sm ${
              i < used ? "bg-sky-500" : "bg-slate-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function AgentTracePanel({
  trace,
  synthesis,
  mode,
}: {
  trace: AgentTrace;
  synthesis: Synthesis;
  mode: string;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const groups = groupSteps(trace.steps);

  const provenance = trace.replayed
    ? "replayed from cache"
    : mode === "live"
      ? "live run"
      : "fixture run";

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Agent activity</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            How the agent sourced each jurisdiction — plan, retrieve, validate,
            and re-query when evidence is thin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
            judge: {trace.judge}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              trace.replayed
                ? "bg-slate-200 text-slate-600"
                : "bg-sky-100 text-sky-700"
            }`}
          >
            {provenance}
          </span>
          <BudgetMeter used={trace.retrievalsUsed} max={trace.maxRetrievals} />
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        {groups.map((g, gi) => {
          const isFinalize = g.steps[0]?.phase === "FINALIZE";
          const attempts = attemptsFor(g.steps);
          const recovered = attempts > 1;
          return (
            <div key={gi}>
              <div className="mb-1.5 flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {isFinalize ? "Finalize" : g.key}
                </h3>
                {!isFinalize && (
                  <span className="font-mono text-[10px] text-slate-400">
                    {attempts} attempt{attempts === 1 ? "" : "s"}
                  </span>
                )}
                {recovered && (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-800">
                    ↻ recovered after thin result
                  </span>
                )}
              </div>
              <div className="space-y-1.5 border-l-2 border-slate-100 pl-3">
                {g.steps.map((s, si) => (
                  <StepRow key={si} step={s} />
                ))}
              </div>
            </div>
          );
        })}

        {/* (4) Synthesis narrative — the agent's post-loop COMPARE output. */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Synthesis
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {synthesis.fromFixture
                ? "template (no ANTHROPIC_API_KEY)"
                : synthesis.model}
            </span>
          </div>
          <p className="text-sm leading-snug text-slate-700">
            {synthesis.narrative}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="font-mono text-[11px] text-slate-400 underline decoration-dotted hover:text-slate-600"
        >
          {showRaw ? "▲ hide raw trace" : "▼ inspect raw trace (JSON)"}
        </button>
        {showRaw && (
          <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-[10px] leading-relaxed text-slate-200">
            {JSON.stringify(trace, null, 2)}
          </pre>
        )}
      </div>
    </section>
  );
}
