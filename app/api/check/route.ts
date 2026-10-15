import { NextResponse } from "next/server";
import { jsonError } from "@/lib/route";
import { runManualCheck } from "@/lib/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    return NextResponse.json(await runManualCheck());
  } catch (error) {
    return jsonError(error);
  }
}
