import type { ReactNode } from "react";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-ink-700 text-ink-200",
  qualifying: "bg-amber-950 text-amber-300",
  disqualified: "bg-ink-800 text-ink-400 line-through",
  researching: "bg-amber-950 text-amber-300",
  analyzing: "bg-amber-950 text-amber-300",
  opportunity_selected: "bg-sky-950 text-sky-300",
  report_ready: "bg-sky-950 text-sky-300",
  outreach_drafted: "bg-violet-950 text-violet-300",
  pending_approval: "bg-violet-950 text-violet-300",
  approved: "bg-violet-950 text-violet-300",
  sent: "bg-emerald-950 text-emerald-300",
  replied: "bg-emerald-900 text-emerald-200",
  demo_scheduled: "bg-emerald-900 text-emerald-200",
  won: "bg-emerald-800 text-emerald-100",
  lost: "bg-red-950 text-red-300",
  archived: "bg-ink-800 text-ink-500",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-ink-700 text-ink-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-ink-800 bg-ink-900 ${className}`}>{children}</div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-800 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-ink-50">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-ink-400">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

const CONFIDENCE_STYLES: Record<string, string> = {
  observed: "bg-emerald-950 text-emerald-300",
  strong_inference: "bg-sky-950 text-sky-300",
  hypothesis: "bg-amber-950 text-amber-300",
};

export function ConfidenceBadge({ confidence }: { confidence: string }) {
  const cls = CONFIDENCE_STYLES[confidence] ?? "bg-ink-700 text-ink-200";
  return (
    <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}>
      {confidence.replace(/_/g, " ")}
    </span>
  );
}

const DETECTABILITY_LABELS: Record<string, string> = {
  directly_detectable: "Directly detectable",
  inferable: "Inferable",
  requires_enrichment: "Requires enrichment",
  requires_declared_information: "Requires declared info",
};

export function DetectabilityBadge({ detectability }: { detectability: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded border border-ink-700 px-1.5 py-0.5 text-[10px] font-medium text-ink-300">
      {DETECTABILITY_LABELS[detectability] ?? detectability}
    </span>
  );
}

export function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-ink-300">{label}</span>
        <span className="font-mono text-ink-100">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
        <div className="h-full rounded-full bg-accent-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function BigScore({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 70 ? "text-emerald-400" : pct >= 40 ? "text-amber-400" : "text-red-400";
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-ink-800 bg-ink-950 px-4 py-3">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-ink-500">/{max} {label}</span>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-5 py-6 text-sm text-ink-500">{children}</p>;
}
