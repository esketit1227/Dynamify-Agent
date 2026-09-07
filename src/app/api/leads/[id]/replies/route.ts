import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { leads, outreachDrafts, replies } from "@/lib/db/schema";
import { classifyReply } from "@/lib/agents/reply-classifier";

export const dynamic = "force-dynamic";

const replySchema = z.object({
  bodyText: z.string().min(1),
  direction: z.enum(["inbound", "outbound"]).default("inbound"),
  occurredAt: z.string().datetime().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const lead = await db.query.leads.findFirst({ where: eq(leads.id, id) });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const latestDraft = await db.query.outreachDrafts.findFirst({
    where: eq(outreachDrafts.leadId, id),
    orderBy: [desc(outreachDrafts.createdAt)],
  });

  let sentiment: "interested" | "wants_more_info" | "not_interested" | "out_of_office" | "unsubscribe" | "unknown" =
    "unknown";
  let wantsDemo = false;
  let nextAction: string | null = null;

  if (parsed.data.direction === "inbound" && latestDraft) {
    const classification = await classifyReply({
      companyName: lead.companyName,
      outreachBodyText: latestDraft.editedBodyText ?? latestDraft.bodyText,
      replyBodyText: parsed.data.bodyText,
    });
    sentiment = classification.sentiment;
    wantsDemo = classification.wantsDemo;
    nextAction = classification.nextAction;
  }

  const [reply] = await db
    .insert(replies)
    .values({
      leadId: id,
      outreachDraftId: latestDraft?.id,
      direction: parsed.data.direction,
      bodyText: parsed.data.bodyText,
      sentiment,
      wantsDemo,
      nextAction,
      occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
    })
    .returning();

  if (parsed.data.direction === "inbound") {
    await db.update(leads).set({ status: "replied", updatedAt: new Date() }).where(eq(leads.id, id));
  }

  return NextResponse.json({ reply });
}
