"use client";

import { useEffect } from "react";
import type { RetrievedSource } from "@/lib/types";

function formatDate(iso: string | null): string {
  if (!iso) return "date unknown";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Source drawer (brief §8): click any source link -> see the Exa highlight
 * snippet + URL + retrieved date. The evidence behind every requirement.
 */
export function SourceDrawer({
  source,
  url,
  retrievedAt,
  onClose,
}: {
  /** The retrieved source for the clicked URL, or null if not found. */
  source: RetrievedSource | null;
  /** The clicked URL (shown even when no source record exists). */
  url: string | null;
  /** When this jurisdiction's data was retrieved (live or cached). */
  retrievedAt: string | null;
  onClose: () => void;
}) {
  const open = url !== null;

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/30 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Source detail"
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            Source evidence
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {open && (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono">
                retrieved {formatDate(retrievedAt)}
              </span>
              {source?.publishedDate && (
                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono">
                  published {formatDate(source.publishedDate)}
                </span>
              )}
            </div>

            <h3 className="text-base font-semibold leading-snug text-slate-800">
              {source?.title ?? "Retrieved source"}
            </h3>

            <a
              href={url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block break-all font-mono text-xs text-sky-600 underline decoration-dotted underline-offset-2 hover:text-sky-800"
            >
              {url}
            </a>

            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Exa highlights
              </div>
              {source && source.highlights.length > 0 ? (
                <ul className="space-y-3">
                  {source.highlights.map((h, i) => (
                    <li
                      key={i}
                      className="border-l-2 border-sky-300 bg-sky-50/50 px-3 py-2 text-sm leading-snug text-slate-700"
                    >
                      “{h}”
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm italic text-slate-400">
                  No highlight snippet was returned for this source.
                </p>
              )}
            </div>

            <p className="mt-6 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-400">
              Snippet retrieved via Exa from the source URL above. Compass shows
              sourced regulatory requirements for orientation only — not legal
              advice.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
