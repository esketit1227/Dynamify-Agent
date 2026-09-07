/**
 * Thin wrapper around the OpenAI Node SDK's Responses API.
 *
 * Every agent in the pipeline calls `runStructured` with a Zod schema; the
 * model's output is parsed and validated against it before it ever reaches
 * the database, so a malformed or incomplete agent response fails loudly
 * instead of silently writing garbage. Optionally attaches the hosted
 * `web_search` tool for agents that need to research beyond the prospect's
 * own site (company/competitor research).
 *
 * Swap-in point for tracing: if you adopt the OpenAI Agents SDK for
 * orchestration/tracing later, this is the module to replace — every other
 * agent file only depends on `runStructured`'s signature, not on how a
 * completion is actually produced.
 */
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";

let client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set. Every Scout agent requires it — copy .env.example to .env.local and set it.",
      );
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

export type AgentModelTier = "research" | "writing";

function modelForTier(tier: AgentModelTier): string {
  if (tier === "research") {
    return process.env.OPENAI_RESEARCH_MODEL ?? "gpt-5.1";
  }
  return process.env.OPENAI_WRITING_MODEL ?? "gpt-5.1";
}

export interface RunStructuredOptions<Schema extends z.ZodType> {
  /** Which model tier to use — reasoning-heavy research vs. content writing. */
  tier: AgentModelTier;
  /** Stable name for this call site; shows up in schema errors and logs. */
  name: string;
  /** System/developer instructions for the agent. */
  instructions: string;
  /** The user-turn input — prompt text, or structured content blocks. */
  input: string;
  schema: Schema;
  /** Attach OpenAI's hosted web search tool for open-web research agents. */
  enableWebSearch?: boolean;
  /** Lower for scoring/analysis determinism, higher for outreach copy. */
  temperature?: number;
}

export interface StructuredRunResult<T> {
  data: T;
  responseId: string;
  model: string;
}

export async function runStructured<Schema extends z.ZodType>(
  opts: RunStructuredOptions<Schema>,
): Promise<StructuredRunResult<z.infer<Schema>>> {
  const openai = getClient();
  const model = modelForTier(opts.tier);

  const response = await openai.responses.parse({
    model,
    instructions: opts.instructions,
    input: opts.input,
    temperature: opts.temperature,
    tools: opts.enableWebSearch ? [{ type: "web_search" }] : undefined,
    text: {
      format: zodTextFormat(opts.schema, opts.name),
    },
  });

  if (response.output_parsed === null || response.output_parsed === undefined) {
    const refusal = response.output
      .flatMap((item) => (item.type === "message" ? item.content : []))
      .find((c) => c.type === "refusal");
    throw new Error(
      `Agent "${opts.name}" produced no parsed output` +
        (refusal && "refusal" in refusal ? `: refused — ${refusal.refusal}` : "."),
    );
  }

  return {
    data: response.output_parsed,
    responseId: response.id,
    model,
  };
}
