import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { outreachDrafts } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const rejectSchema = z.object({
  reason: z.string().min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; draftId: string }> },
) {
  const { id, draftId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const draft = await db.query.outreachDrafts.findFirst({ where: eq(outreachDrafts.id, draftId) });
  if (!draft || draft.leadId !== id) {
    return NextResponse.json({ error: "Outreach draft not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(outreachDrafts)
    .set({ status: "rejected", rejectionReason: parsed.data.reason, updatedAt: new Date() })
    .where(eq(outreachDrafts.id, draftId))
    .returning();

  return NextResponse.json({ draft: updated });
}
