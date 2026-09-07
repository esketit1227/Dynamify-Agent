import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { outreachDrafts, leads } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const approveSchema = z.object({
  approverEmail: z.string().email(),
  /** Human edits to the draft body/subject before it's approved — outreach is always human-reviewable before it goes out. */
  editedBodyText: z.string().min(1).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; draftId: string }> },
) {
  const { id, draftId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const draft = await db.query.outreachDrafts.findFirst({ where: eq(outreachDrafts.id, draftId) });
  if (!draft || draft.leadId !== id) {
    return NextResponse.json({ error: "Outreach draft not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(outreachDrafts)
    .set({
      status: "approved",
      approvedByEmail: parsed.data.approverEmail,
      approvedAt: new Date(),
      editedBodyText: parsed.data.editedBodyText ?? draft.editedBodyText,
      rejectionReason: null,
      updatedAt: new Date(),
    })
    .where(eq(outreachDrafts.id, draftId))
    .returning();

  await db.update(leads).set({ status: "approved", updatedAt: new Date() }).where(eq(leads.id, id));

  return NextResponse.json({ draft: updated });
}
