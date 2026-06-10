"use client";

import { MONITOR_CONFIG, SAMPLE_WEBHOOK_PAYLOAD } from "@/lib/monitor";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className="break-all font-mono text-xs text-slate-700">{value}</span>
    </div>
  );
}

/**
 * Watch panel (brief §8/§10.6). Shows the pre-created Exa Monitor config and a
 * sample webhook payload — STATIC. No live monitor, no receiver. It demonstrates
 * how Compass would detect a regulation change the moment it is published.
 */
export function WatchPanel() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">
            Stay current — Exa Monitor
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            A pre-created monitor watches the sources for changes and pushes new
            results via webhook.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
          config preview · not live-firing
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
        {/* Monitor config */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-slate-600">
              Monitor configuration
            </span>
          </div>
          <div className="space-y-3">
            <Field label="monitor id" value={MONITOR_CONFIG.id} />
            <Field label="name" value={MONITOR_CONFIG.name} />
            <Field label="query" value={MONITOR_CONFIG.query} />
            <Field
              label="include domains"
              value={MONITOR_CONFIG.includeDomains.join(", ")}
            />
            <div className="flex gap-6">
              <Field label="cadence" value={MONITOR_CONFIG.cadence} />
              <Field label="category" value={MONITOR_CONFIG.category} />
            </div>
            <Field label="webhook" value={MONITOR_CONFIG.webhookUrl} />
          </div>
        </div>

        {/* Sample webhook payload */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            <span className="text-xs font-semibold text-slate-300">
              Sample webhook payload (on change)
            </span>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-slate-200">
            {JSON.stringify(SAMPLE_WEBHOOK_PAYLOAD, null, 2)}
          </pre>
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
        When a watched regulator publishes a change, this payload would arrive and
        flag the affected jurisdiction&apos;s row as{" "}
        <span className="font-semibold text-slate-700">stale</span> until
        re-retrieved — so the comparison never silently drifts out of date.
      </div>
    </section>
  );
}
