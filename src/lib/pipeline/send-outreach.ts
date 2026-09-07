/**
 * The only function in the codebase allowed to send an outreach email. It
 * refuses unless the draft has already been explicitly approved by a human
 * (status "approved", approvedByEmail set) — see the approve/reject API
 * routes for the only two places that transition a draft into that state.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { leads, outreachDrafts } from "@/lib/db/schema";
import { getEmailProvider } from "@/lib/email/provider";

export async function sendApprovedOutreach(outreachDraftId: string): Promise<void> {
  const draft = await db.query.outreachDrafts.findFirst({
    where: eq(outreachDrafts.id, outreachDraftId),
  });
  if (!draft) throw new Error(`Outreach draft ${outreachDraftId} not found`);

  if (draft.status !== "approved" || !draft.approvedByEmail) {
    throw new Error(
      `Outreach draft ${outreachDraftId} is not approved (status=${draft.status}). ` +
        "Refusing to send — a human must approve a draft before it can go out.",
    );
  }

  const lead = await db.query.leads.findFirst({ where: eq(leads.id, draft.leadId) });
  if (!lead) throw new Error(`Lead ${draft.leadId} not found`);

  const recipient = draft.recipientGuess.email;
  if (!recipient) {
    throw new Error(
      "No recipient email is set on this draft. Add one via the outreach edit UI before sending.",
    );
  }

  const provider = getEmailProvider();
  const result = await provider.send({
    to: recipient,
    fromEmail: process.env.OUTREACH_FROM_EMAIL ?? "scout@dynamify.example",
    subject: draft.subject,
    bodyText: draft.editedBodyText ?? draft.bodyText,
  });

  await db
    .update(outreachDrafts)
    .set({ status: "sent", sentAt: new Date(), providerMessageId: result.providerMessageId })
    .where(eq(outreachDrafts.id, outreachDraftId));

  await db.update(leads).set({ status: "sent", updatedAt: new Date() }).where(eq(leads.id, lead.id));
}
