"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export interface RectView {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ChangeRegionView {
  section: string;
  selector: string;
  change: string;
  rationale: string;
  beforeRect: RectView | null;
  afterRect: RectView | null;
}

export interface PlannedChangeView {
  section: string;
  change: string;
  rationale: string;
}

export interface PreviewCompareProps {
  beforeScreenshotPath: string | null;
  afterScreenshotPath: string | null;
  beforeHtmlPath: string;
  afterHtmlPath: string;
  changeRegions: ChangeRegionView[];
  /** Plain fallback for previews generated before change-region capture existed. */
  changesSummary: PlannedChangeView[];
}

type Mode = "slider" | "side" | "before" | "after";

/** One screenshot with optional numbered highlight boxes, scaled from PNG pixel coords to however wide it's actually rendered. */
function ScreenshotLayer({
  src,
  alt,
  boxes,
  showHighlights,
  activeIndex,
  onHover,
  onSelect,
  clipRightPct,
  className = "",
}: {
  src: string;
  alt: string;
  boxes: { index: number; rect: RectView | null }[];
  showHighlights: boolean;
  activeIndex: number | null;
  onHover: (i: number | null) => void;
  onSelect: (i: number) => void;
  clipRightPct?: number;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    // A cached image can finish loading before this effect (and the `onLoad`
    // prop) attaches, in which case `load` never fires again — check
    // `.complete` directly so highlights still show up on a fast/cached hit.
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    }
  }, [src]);

  const scale = natural && width ? width / natural.w : 0;

  return (
    <div
      ref={wrapRef}
      className={`relative ${className}`}
      style={clipRightPct !== undefined ? { clipPath: `inset(0 ${clipRightPct}% 0 0)` } : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        className="block w-full select-none"
        onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
      />
      {showHighlights && scale > 0
        ? boxes.map(({ index, rect }) =>
            rect ? (
              <button
                key={index}
                type="button"
                data-testid="preview-highlight-box"
                onMouseEnter={() => onHover(index)}
                onMouseLeave={() => onHover(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(index);
                }}
                className={`absolute rounded border-2 transition-colors ${
                  activeIndex === index
                    ? "border-accent-400 bg-accent-500/25"
                    : "border-accent-500/60 bg-accent-500/[0.06] hover:border-accent-400 hover:bg-accent-500/15"
                }`}
                style={{
                  left: rect.x * scale,
                  top: rect.y * scale,
                  width: Math.max(rect.width * scale, 6),
                  height: Math.max(rect.height * scale, 6),
                }}
              >
                <span
                  className={`absolute -left-2.5 -top-2.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white shadow ${
                    activeIndex === index ? "bg-accent-400" : "bg-accent-600"
                  }`}
                >
                  {index + 1}
                </span>
              </button>
            ) : null,
          )
        : null}
    </div>
  );
}

export function PreviewCompare({
  beforeScreenshotPath,
  afterScreenshotPath,
  beforeHtmlPath,
  afterHtmlPath,
  changeRegions,
  changesSummary,
}: PreviewCompareProps) {
  const bothAvailable = Boolean(beforeScreenshotPath && afterScreenshotPath);
  const [mode, setMode] = useState<Mode>(bothAvailable ? "slider" : "after");
  const [sliderPct, setSliderPct] = useState(50);
  const [showHighlights, setShowHighlights] = useState(changeRegions.length > 0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const draggingRef = useRef(false);
  const outerRef = useRef<HTMLDivElement>(null);

  const boxesBefore = changeRegions.map((r, i) => ({ index: i, rect: r.beforeRect }));
  const boxesAfter = changeRegions.map((r, i) => ({ index: i, rect: r.afterRect }));

  function updateFromClientX(clientX: number) {
    const el = outerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSliderPct(Math.min(100, Math.max(0, pct)));
  }

  function onHandlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  }
  function onHandlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  }
  function onHandlePointerUp() {
    draggingRef.current = false;
  }

  const modes: { key: Mode; label: string; disabled?: boolean }[] = [
    { key: "slider", label: "slider", disabled: !bothAvailable },
    { key: "side", label: "side by side", disabled: !bothAvailable },
    { key: "before", label: "before", disabled: !beforeScreenshotPath },
    { key: "after", label: "after", disabled: !afterScreenshotPath },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1 text-xs">
        {modes.map((m) => (
          <button
            key={m.key}
            disabled={m.disabled}
            onClick={() => setMode(m.key)}
            className={`rounded px-2 py-1 capitalize disabled:cursor-not-allowed disabled:opacity-30 ${
              mode === m.key ? "bg-accent-600 text-white" : "bg-ink-800 text-ink-300 hover:bg-ink-700"
            }`}
          >
            {m.label}
          </button>
        ))}
        {changeRegions.length > 0 && (
          <label className="ml-2 flex items-center gap-1.5 text-ink-400">
            <input
              type="checkbox"
              checked={showHighlights}
              onChange={(e) => setShowHighlights(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-ink-600 bg-ink-950"
            />
            Show changes ({changeRegions.length})
          </label>
        )}
        <span className="ml-auto flex gap-3 text-ink-500">
          <a href={beforeHtmlPath} target="_blank" rel="noreferrer" className="hover:text-accent-400">
            view before HTML
          </a>
          <a href={afterHtmlPath} target="_blank" rel="noreferrer" className="hover:text-accent-400">
            view after HTML
          </a>
        </span>
      </div>

      {mode === "slider" && bothAvailable ? (
        <div
          ref={outerRef}
          onClick={(e) => updateFromClientX(e.clientX)}
          className="relative cursor-col-resize overflow-hidden rounded-lg border border-ink-800 select-none"
        >
          <div className="pointer-events-none absolute left-2 top-2 z-10 rounded bg-ink-950/70 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-300 backdrop-blur">
            Before
          </div>
          <div
            className="pointer-events-none absolute right-2 top-2 z-10 rounded bg-accent-600/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur"
            style={{ opacity: sliderPct > 12 ? 1 : 0 }}
          >
            After (Dynamify-personalized)
          </div>

          <ScreenshotLayer
            src={beforeScreenshotPath!}
            alt="Before"
            boxes={boxesBefore}
            showHighlights={false}
            activeIndex={activeIndex}
            onHover={setActiveIndex}
            onSelect={setActiveIndex}
          />
          <div className="pointer-events-none absolute inset-0">
            <ScreenshotLayer
              src={afterScreenshotPath!}
              alt="After"
              boxes={boxesAfter}
              showHighlights={showHighlights}
              activeIndex={activeIndex}
              onHover={setActiveIndex}
              onSelect={setActiveIndex}
              clipRightPct={100 - sliderPct}
              className="pointer-events-auto h-full"
            />
          </div>

          <div
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            data-testid="preview-slider-handle"
            className="absolute inset-y-0 z-20 flex w-6 -translate-x-1/2 cursor-col-resize items-center justify-center touch-none"
            style={{ left: `${sliderPct}%` }}
          >
            <div className="h-full w-0.5 bg-white/90 shadow" />
            <div className="absolute flex h-7 w-7 items-center justify-center rounded-full border border-ink-300 bg-white text-ink-900 shadow">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4 2L1 6l3 4M8 2l3 4-3 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      ) : null}

      {mode === "side" && bothAvailable ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="overflow-hidden rounded-lg border border-ink-800">
            <div className="border-b border-ink-800 bg-ink-950 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-500">
              Before (live site)
            </div>
            <ScreenshotLayer
              src={beforeScreenshotPath!}
              alt="Before"
              boxes={boxesBefore}
              showHighlights={showHighlights}
              activeIndex={activeIndex}
              onHover={setActiveIndex}
              onSelect={setActiveIndex}
            />
          </div>
          <div className="overflow-hidden rounded-lg border border-accent-600/40">
            <div className="border-b border-ink-800 bg-ink-950 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-accent-400">
              After (Dynamify-personalized)
            </div>
            <ScreenshotLayer
              src={afterScreenshotPath!}
              alt="After"
              boxes={boxesAfter}
              showHighlights={showHighlights}
              activeIndex={activeIndex}
              onHover={setActiveIndex}
              onSelect={setActiveIndex}
            />
          </div>
        </div>
      ) : null}

      {mode === "before" ? (
        beforeScreenshotPath ? (
          <div className="overflow-hidden rounded-lg border border-ink-800">
            <ScreenshotLayer
              src={beforeScreenshotPath}
              alt="Before"
              boxes={boxesBefore}
              showHighlights={showHighlights}
              activeIndex={activeIndex}
              onHover={setActiveIndex}
              onSelect={setActiveIndex}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-ink-800 p-6 text-xs text-ink-500">No screenshot captured.</div>
        )
      ) : null}

      {mode === "after" ? (
        afterScreenshotPath ? (
          <div className="overflow-hidden rounded-lg border border-accent-600/40">
            <ScreenshotLayer
              src={afterScreenshotPath}
              alt="After"
              boxes={boxesAfter}
              showHighlights={showHighlights}
              activeIndex={activeIndex}
              onHover={setActiveIndex}
              onSelect={setActiveIndex}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-ink-800 p-6 text-xs text-ink-500">No screenshot captured.</div>
        )
      ) : null}

      {changeRegions.length > 0 ? (
        <ul className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-ink-800 p-2">
          {changeRegions.map((r, i) => (
            <li
              key={i}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              onClick={() => setActiveIndex(i)}
              className={`flex cursor-pointer items-start gap-2 rounded-md p-2 text-xs transition-colors ${
                activeIndex === i ? "bg-accent-600/10" : "hover:bg-ink-800/60"
              }`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white ${
                  activeIndex === i ? "bg-accent-400" : "bg-accent-600"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <span className="font-medium text-ink-200">{r.section}: </span>
                <span className="text-ink-300">{r.change}</span>
                {r.rationale ? <p className="mt-0.5 italic text-ink-500">{r.rationale}</p> : null}
                {!r.afterRect ? (
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-600">
                    removed — no longer on the page
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : changesSummary.length > 0 ? (
        <ul className="space-y-2 text-xs">
          {changesSummary.map((c, i) => (
            <li key={i} className="rounded border border-ink-800 p-2">
              <span className="font-semibold text-ink-200">{c.section}: </span>
              <span className="text-ink-300">{c.change}</span>
              <p className="mt-0.5 italic text-ink-500">{c.rationale}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
