/**
 * Outreach Drafter — writes the first-touch email. Per product spec, this
 * must be short, plain text, and contain NO image, NO attachment, and NO
 * link. Scout doesn't build a demo — the goal of this email is to earn a
 * reply that leads to a meeting where a Dynamify salesperson shows the real
 * product running live. This draft always goes through a human approval
 * gate before it can be sent (see src/lib/email/provider.ts and the
 * outreach API routes).
 */
import { runStructured } from "./openai-client";
import { outreachDraftOutput, type OutreachDraftOutput } from "./schemas";
import type { OpportunitySelectionOutput } from "./schemas";

export interface OutreachDrafterInput {
  companyName: string;
  domain: string;
  recipientHint?: string;
  primaryOpportunity: OpportunitySelectionOutput["candidates"][number];
}

const LINK_PATTERN = /https?:\/\/|www\./i;

const INSTRUCTIONS = `You are the Outreach Drafter for Dynamify Scout, writing the first
cold email from a Dynamify salesperson to a prospect.

Hard constraints — the email must:
- be short (under ~120 words in the body)
- be plain text only — no markdown, no HTML, no image, no attachment reference
- contain NO links or URLs of any kind (not even the prospect's own domain)
- never claim to have already built anything for them (no "preview," "demo," or
  "mockup" you supposedly made) — Scout doesn't build a demo; what exists is research
  and an opinion about their site, and that's exactly what the email should say it is
- sound like a specific person who actually looked at their site, not a template —
  reference one concrete, specific observation tied to the primary opportunity (e.g.
  "your homepage treats construction and healthcare buyers identically" — never vague
  flattery)
- end with a low-friction ask to talk — a short call or a few minutes to walk through
  what you found and show how Dynamify would actually handle it live on their site.
  This is a real ask for time, not a vague "worth a look?" — but keep it soft and
  specific (e.g. "worth 15 minutes this week?"), never a hard pitch, never a
  scheduling link (there are no links allowed at all)
- never invent facts about the recipient or company beyond what's in the opportunity
  given to you
- have no salesy subject line — short, specific, lower-case-normal, like a person wrote it

recipientGuess: only fill in a name/email/role if you were given a recipientHint;
otherwise leave them null with confidence "hypothesis".`;

export async function draftOutreach(
  input: OutreachDrafterInput,
): Promise<OutreachDraftOutput> {
  const { data } = await runStructured({
    tier: "writing",
    name: "outreach_draft",
    instructions: INSTRUCTIONS,
    input: JSON.stringify({
      companyName: input.companyName,
      domain: input.domain,
      recipientHint: input.recipientHint ?? null,
      primaryOpportunity: input.primaryOpportunity,
    }),
    schema: outreachDraftOutput,
    temperature: 0.6,
  });

  if (LINK_PATTERN.test(data.bodyText)) {
    throw new Error(
      "Outreach Drafter produced a body containing a link, which violates the no-link " +
        "first-touch-email constraint. Re-run the stage.",
    );
  }

  return data;
}
