"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function ReplyForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [bodyText, setBodyText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyText, direction: "inbound" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ? JSON.stringify(json.error) : `Request failed`);
      setBodyText("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 p-5">
      <p className="text-xs text-ink-400">
        Paste the prospect&apos;s reply — Scout will classify sentiment and suggest a next
        action.
      </p>
      <textarea
        required
        value={bodyText}
        onChange={(e) => setBodyText(e.target.value)}
        rows={4}
        placeholder="Paste the reply text here…"
        className="w-full resize-y rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 outline-none focus:border-accent-500"
      />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-500 disabled:opacity-50"
      >
        {pending ? "Logging…" : "Log reply"}
      </button>
    </form>
  );
}
