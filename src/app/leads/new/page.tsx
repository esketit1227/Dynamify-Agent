"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";

export default function NewLeadPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [domain, setDomain] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [runImmediately, setRunImmediately] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          domain,
          ownerEmail: ownerEmail || undefined,
          notes: notes || undefined,
          runImmediately,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(body.error ?? body));
      router.push(`/leads/${body.lead.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-lg font-semibold text-ink-50">New lead</h1>
      <p className="mb-6 text-sm text-ink-400">
        Scout will qualify ICP fit first, then only run the full research pipeline if the
        company is worth analyzing.
      </p>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-300">Company name</label>
            <input
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-50 outline-none focus:border-accent-500"
              placeholder="Acme Construction Software"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-300">Domain</label>
            <input
              required
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-50 outline-none focus:border-accent-500"
              placeholder="acme.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-300">
              Owner email (optional)
            </label>
            <input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-50 outline-none focus:border-accent-500"
              placeholder="ae@dynamify.example"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-300">
              Enrichment / notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-50 outline-none focus:border-accent-500"
              placeholder="Anything already known — funding, employee count, how this lead was sourced…"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-300">
            <input
              type="checkbox"
              checked={runImmediately}
              onChange={(e) => setRunImmediately(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-ink-600 bg-ink-950"
            />
            Run the research pipeline immediately
          </label>
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-accent-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-500 disabled:opacity-50"
          >
            {pending ? "Creating…" : "Create lead"}
          </button>
        </form>
      </Card>
    </div>
  );
}
