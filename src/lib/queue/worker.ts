/**
 * Standalone worker process: `npm run worker`.
 *
 * Kept separate from the Next.js server so a long-running lead pipeline
 * (multiple OpenAI calls + Playwright navigations, easily a few minutes)
 * never ties up a web request/serverless invocation. The web app only ever
 * enqueues jobs (see src/lib/queue/boss.ts); this process is what actually
 * runs them.
 */
import "@/lib/env";
import { getBoss, LEAD_PIPELINE_QUEUE, type LeadPipelineJobData } from "./boss";
import { runLeadPipeline } from "@/lib/pipeline/run-lead";
import { closeBrowser } from "@/lib/capture/browser";

async function main() {
  const boss = await getBoss();

  await boss.work<LeadPipelineJobData>(LEAD_PIPELINE_QUEUE, async (jobs) => {
    const job = jobs[0];
    if (!job) return;
    const { leadId } = job.data;
    console.log(`[worker] running pipeline for lead ${leadId} (job ${job.id})`);
    try {
      await runLeadPipeline(leadId);
      console.log(`[worker] finished lead ${leadId}`);
    } catch (err) {
      console.error(`[worker] pipeline failed for lead ${leadId}:`, err);
      throw err;
    }
  });

  console.log(`[worker] listening on queue "${LEAD_PIPELINE_QUEUE}"`);

  const shutdown = async () => {
    console.log("[worker] shutting down...");
    await closeBrowser();
    await boss.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[worker] fatal error:", err);
  process.exit(1);
});
