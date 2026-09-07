"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const STAGES = [
  "no_response",
  "demo_booked",
  "demo_completed",
  "opportunity_created",
  "closed_won",
  "closed_lost",
] as const;

export function OutcomeForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<(typeof STAGES)[number]>("demo_booked");
  const [notes, setNotes] = useState("");
  const [dealValueUsd, setDealValueUsd] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/outcomes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage,
          notes: notes || undefined,
          dealValueUsd: dealValueUsd ? Number(dealValueUsd) : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ? JSON.stringify(json.error) : `Request failed`);
      setNotes("");
      setDealValueUsd("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as (typeof STAGES)[number])}
          className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-xs text-ink-100"
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <input
          placeholder="Deal value USD (optional)"
          type="number"
          value={dealValueUsd}
          onChange={(e) => setDealValueUsd(e.target.value)}
          className="w-48 rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-xs text-ink-100 outline-none focus:border-accent-500"
        />
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Notes (optional)"
        className="w-full resize-y rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-xs text-ink-100 outline-none focus:border-accent-500"
      />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-500 disabled:opacity-50"
      >
        {pending ? "Logging…" : "Log CRM outcome"}
      </button>
    </form>
  );
}
