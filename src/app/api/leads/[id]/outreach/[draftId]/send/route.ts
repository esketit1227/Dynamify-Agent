import { NextResponse } from "next/server";
import { sendApprovedOutreach } from "@/lib/pipeline/send-outreach";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; draftId: string }> },
) {
  const { draftId } = await params;
  try {
    await sendApprovedOutreach(draftId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
