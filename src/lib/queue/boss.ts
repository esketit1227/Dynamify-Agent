/**
 * Single pg-boss instance shared by both the Next.js app (to enqueue runs)
 * and the standalone worker process (to execute them). Postgres-backed, so
 * it needs nothing beyond the DATABASE_URL already required for the app —
 * no separate Redis/broker to provision.
 */
import PgBoss from "pg-boss";

export const LEAD_PIPELINE_QUEUE = "lead-pipeline-run";

export interface LeadPipelineJobData {
  leadId: string;
}

let boss: PgBoss | undefined;
let starting: Promise<PgBoss> | undefined;

async function createAndStart(): Promise<PgBoss> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — required for the pg-boss job queue.");
  }
  const instance = new PgBoss(connectionString);
  instance.on("error", (err) => console.error("[pg-boss]", err));
  await instance.start();
  await instance.createQueue(LEAD_PIPELINE_QUEUE);
  return instance;
}

/** Lazily creates and starts the shared pg-boss instance (idempotent). */
export async function getBoss(): Promise<PgBoss> {
  if (boss) return boss;
  if (!starting) {
    starting = createAndStart().then((instance) => {
      boss = instance;
      return instance;
    });
  }
  return starting;
}

export async function enqueueLeadPipeline(leadId: string): Promise<string | null> {
  const instance = await getBoss();
  return instance.send(LEAD_PIPELINE_QUEUE, { leadId } satisfies LeadPipelineJobData);
}
