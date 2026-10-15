import { NextResponse } from "next/server";
import { jsonError } from "@/lib/route";
import { markNoticesRead } from "@/lib/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { ids?: string[] };
    const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === "string") : undefined;
    return NextResponse.json({ state: await markNoticesRead(ids) });
  } catch (error) {
    return jsonError(error);
  }
}
