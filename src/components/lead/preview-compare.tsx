"use client";

import { useState } from "react";

export interface PreviewCompareProps {
  beforeScreenshotPath: string | null;
  afterScreenshotPath: string | null;
  beforeHtmlPath: string;
  afterHtmlPath: string;
}

export function PreviewCompare({
  beforeScreenshotPath,
  afterScreenshotPath,
  beforeHtmlPath,
  afterHtmlPath,
}: PreviewCompareProps) {
  const [view, setView] = useState<"side" | "before" | "after">("side");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 text-xs">
        {(["side", "before", "after"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded px-2 py-1 capitalize ${
              view === v ? "bg-accent-600 text-white" : "bg-ink-800 text-ink-300 hover:bg-ink-700"
            }`}
          >
            {v === "side" ? "side by side" : v}
          </button>
        ))}
        <span className="ml-auto flex gap-3 text-ink-500">
          <a href={beforeHtmlPath} target="_blank" rel="noreferrer" className="hover:text-accent-400">
            view before HTML
          </a>
          <a href={afterHtmlPath} target="_blank" rel="noreferrer" className="hover:text-accent-400">
            view after HTML
          </a>
        </span>
      </div>

      <div className={view === "side" ? "grid grid-cols-2 gap-3" : "grid grid-cols-1"}>
        {(view === "side" || view === "before") && (
          <div className="overflow-hidden rounded-lg border border-ink-800">
            <div className="border-b border-ink-800 bg-ink-950 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-500">
              Before (live site)
            </div>
            {beforeScreenshotPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={beforeScreenshotPath} alt="Before" className="w-full" />
            ) : (
              <div className="p-6 text-xs text-ink-500">No screenshot captured.</div>
            )}
          </div>
        )}
        {(view === "side" || view === "after") && (
          <div className="overflow-hidden rounded-lg border border-accent-600/40">
            <div className="border-b border-ink-800 bg-ink-950 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-accent-400">
              After (Dynamify-personalized)
            </div>
            {afterScreenshotPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={afterScreenshotPath} alt="After" className="w-full" />
            ) : (
              <div className="p-6 text-xs text-ink-500">No screenshot captured.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
