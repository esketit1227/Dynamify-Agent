"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface OutreachDraftView {
  id: string;
  subject: string;
  bodyText: string;
  editedBodyText: string | null;
  status: string;
  recipientGuess: { name: string | null; email: string | null; role: string | null; confidence: string };
  approvedByEmail: string | null;
  approvedAt: string | Date | null;
  sentAt: string | Date | null;
  rejectionReason: string | null;
}

export function OutreachPanel({ leadId, draft }: { leadId: string; draft: OutreachDraftView }) {
  const router = useRouter();
  const [body, setBody] = useState(draft.editedBodyText ?? draft.bodyText);
  const [approverEmail, setApproverEmail] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(path: string, body_: unknown, key: string) {
    setPending(key);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/outreach/${draft.id}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body_),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(null);
    }
  }

  const editable = draft.status === "draft" || draft.status === "pending_approval";
  const bodyChanged = body !== (draft.editedBodyText ?? draft.bodyText);

  return (
    <div className="space-y-3 p-5">
      <div className="flex items-center justify-between text-xs text-ink-400">
        <span>
          To: {draft.recipientGuess.name ?? "unknown"}{" "}
          {draft.recipientGuess.email ? `<${draft.recipientGuess.email}>` : "(no email guessed)"} ·{" "}
          {draft.recipientGuess.role ?? "role unknown"}
        </span>
        <span className="rounded bg-ink-800 px-2 py-0.5 uppercase tracking-wide">{draft.status}</span>
      </div>

      <div>
        <div className="mb-1 text-xs font-medium text-ink-300">Subject</div>
        <div className="rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100">
          {draft.subject}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-medium text-ink-300">Body (plain text, no links/images)</div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          readOnly={!editable}
          rows={8}
          className="w-full resize-y rounded-md border border-ink-700 bg-ink-950 px-3 py-2 font-mono text-sm text-ink-100 outline-none focus:border-accent-500 disabled:opacity-60"
        />
      </div>

      {draft.status === "sent" ? (
        <p className="text-xs text-emerald-400">
          Sent {draft.sentAt ? new Date(draft.sentAt).toLocaleString() : ""}
        </p>
      ) : draft.status === "rejected" ? (
        <p className="text-xs text-red-400">Rejected: {draft.rejectionReason}</p>
      ) : draft.status === "approved" ? (
        <div className="flex items-center gap-3">
          <p className="text-xs text-violet-300">
            Approved by {draft.approvedByEmail} — ready to send.
          </p>
          <button
            onClick={() => call("send", {}, "send")}
            disabled={pending !== null}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {pending === "send" ? "Sending…" : "Send now"}
          </button>
        </div>
      ) : (
        <div className="space-y-2 rounded-md border border-ink-800 bg-ink-950/60 p-3">
          <p className="text-xs text-ink-400">
            A human must approve this draft before it can be sent — Scout never sends
            automatically.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="email"
              placeholder="you@dynamify.example"
              value={approverEmail}
              onChange={(e) => setApproverEmail(e.target.value)}
              className="w-56 rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-xs text-ink-100 outline-none focus:border-accent-500"
            />
            <button
              onClick={() =>
                call(
                  "approve",
                  { approverEmail, editedBodyText: bodyChanged ? body : undefined },
                  "approve",
                )
              }
              disabled={pending !== null || !approverEmail}
              className="rounded-md bg-accent-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-500 disabled:opacity-50"
            >
              {pending === "approve" ? "Approving…" : "Approve"}
            </button>
            <input
              placeholder="Rejection reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-56 rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-xs text-ink-100 outline-none focus:border-red-500"
            />
            <button
              onClick={() => call("reject", { reason: rejectReason }, "reject")}
              disabled={pending !== null || !rejectReason}
              className="rounded-md border border-red-800 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-950 disabled:opacity-50"
            >
              {pending === "reject" ? "Rejecting…" : "Reject"}
            </button>
          </div>
        </div>
      )}

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
