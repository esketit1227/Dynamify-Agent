/**
 * Wraps a single pipeline stage's execution with an audit-trail row in
 * `pipeline_stage_events`. Every agent call in the system goes through
 * this, so the dashboard can show exactly what ran, what it produced, how
 * long it took, and — when something breaks — exactly which stage and why.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pipelineRuns, pipelineStageEvents, type pipelineStageEnum } from "@/lib/db/schema";

export type PipelineStage = (typeof pipelineStageEnum.enumValues)[number];

export interface RunStageParams<T> {
  pipelineRunId: string;
  leadId: string;
  stage: PipelineStage;
  input?: unknown;
  fn: () => Promise<T>;
}

export async function runStage<T>(params: RunStageParams<T>): Promise<T> {
  const [event] = await db
    .insert(pipelineStageEvents)
    .values({
      pipelineRunId: params.pipelineRunId,
      leadId: params.leadId,
      stage: params.stage,
      status: "running",
      input: (params.input ?? null) as never,
    })
    .returning();

  await db
    .update(pipelineRuns)
    .set({ currentStage: params.stage })
    .where(eq(pipelineRuns.id, params.pipelineRunId));

  try {
    const output = await params.fn();
    await db
      .update(pipelineStageEvents)
      .set({ status: "succeeded", output: (output ?? null) as never, finishedAt: new Date() })
      .where(eq(pipelineStageEvents.id, event!.id));
    return output;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(pipelineStageEvents)
      .set({ status: "failed", error: message, finishedAt: new Date() })
      .where(eq(pipelineStageEvents.id, event!.id));
    throw err;
  }
}
