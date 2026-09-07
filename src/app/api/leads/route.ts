import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import { enqueueLeadPipeline } from "@/lib/queue/jobs";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.query.leads.findMany({
    orderBy: [desc(leads.createdAt)],
    limit: 200,
  });
  return NextResponse.json({ leads: rows });
}

const createLeadSchema = z.object({
  companyName: z.string().min(1),
  domain: z.string().min(1),
  homepageUrl: z.string().url().optional(),
  ownerEmail: z.string().email().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
  /** Enqueue the research pipeline immediately after creating the lead. */
  runImmediately: z.boolean().optional(),
});

function normalizeDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "")
    .toLowerCase();
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const domain = normalizeDomain(parsed.data.domain);
  const homepageUrl = parsed.data.homepageUrl ?? `https://${domain}`;

  const [lead] = await db
    .insert(leads)
    .values({
      companyName: parsed.data.companyName,
      domain,
      homepageUrl,
      ownerEmail: parsed.data.ownerEmail,
      notes: parsed.data.notes,
      source: parsed.data.source ?? "manual",
    })
    .returning();

  if (parsed.data.runImmediately && lead) {
    await enqueueLeadPipeline(lead.id);
  }

  return NextResponse.json({ lead }, { status: 201 });
}
