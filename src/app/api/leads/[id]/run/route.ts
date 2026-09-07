import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import { enqueueLeadPipeline } from "@/lib/queue/jobs";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, id) });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const jobId = await enqueueLeadPipeline(id);
  return NextResponse.json({ jobId });
}
