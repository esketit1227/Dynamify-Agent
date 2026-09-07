"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RunPipelineButton({
  leadId,
  label = "Run pipeline",
  className = "",
}: {
  leadId: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/run`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className={`rounded-md bg-accent-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        {pending ? "Running…" : label}
      </button>
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  );
}
