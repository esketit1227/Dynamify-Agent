/**
 * Classifies an inbound reply a human has logged (pasted in) so the
 * dashboard can surface sentiment and next action without an AE having to
 * re-read and triage every thread manually.
 */
import { runStructured } from "./openai-client";
import { replyClassificationOutput, type ReplyClassificationOutput } from "./schemas";

export interface ReplyClassifierInput {
  companyName: string;
  outreachBodyText: string;
  replyBodyText: string;
}

const INSTRUCTIONS = `You are the Reply Classifier for Dynamify Scout. Given the original
outreach email and a prospect's reply, classify sentiment (interested / wants_more_info
/ not_interested / out_of_office / unsubscribe / unknown), whether they're willing to
book a meeting/call to see the Dynamify demo live ("wantsDemo"), and a one-sentence
recommended nextAction for the Dynamify salesperson (e.g. "Propose 2-3 times this week
for a 20-minute call.").`;

export async function classifyReply(
  input: ReplyClassifierInput,
): Promise<ReplyClassificationOutput> {
  const { data } = await runStructured({
    tier: "writing",
    name: "reply_classification",
    instructions: INSTRUCTIONS,
    input: JSON.stringify(input),
    schema: replyClassificationOutput,
    temperature: 0.2,
  });
  return data;
}
