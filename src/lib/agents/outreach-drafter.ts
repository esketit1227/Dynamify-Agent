/**
 * Outreach Drafter — writes the first-touch email. Per product spec, this
 * must be short, plain text, and contain NO image, NO attachment, and NO
 * link. The preview/demo is offered, not shown, until the prospect asks —
 * this draft always goes through a human approval gate before it can be
 * sent (see src/lib/email/provider.ts and the outreach API routes).
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
- contain NO links or URLs of any kind (not even the prospect's own domain) and NOT
  mention having built a demo/preview yet — the goal is to start a conversation, the
  personalized preview is offered only after they reply
- sound like a specific person who actually looked at their site, not a template —
  reference one concrete, specific observation tied to the primary opportunity (e.g.
  "your homepage treats construction and healthcare buyers identically" — never vague
  flattery)
- end with a low-friction, curiosity-driving question or ask (e.g. asking if it's worth
  a quick look at something), not a hard pitch or meeting-link ask
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
