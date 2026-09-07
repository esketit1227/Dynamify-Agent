/**
 * Serves locally-stored website captures (screenshots, HTML snapshots) for
 * the dashboard when STORAGE_DRIVER=local. An S3-backed deployment would
 * instead have `storage.locate()` return real (signed) URLs and this route
 * would go unused.
 */
import { NextResponse } from "next/server";
import { getStorage } from "@/lib/capture/storage";

export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = path.join("/");
  const storage = getStorage();

  try {
    const data = await storage.read(key);
    const ext = key.split(".").pop()?.toLowerCase() ?? "";
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=60" },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
