import { NextResponse } from "next/server";
import { testWebhook } from "@/lib/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { url?: string };
  const result = await testWebhook(body.url ?? "");
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
