import { NextResponse } from "next/server";
import { getLeadDetail } from "@/lib/pipeline/lead-detail";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getLeadDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
