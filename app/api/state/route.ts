import { NextResponse } from "next/server";
import { jsonError } from "@/lib/route";
import { getState } from "@/lib/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ state: await getState() });
  } catch (error) {
    return jsonError(error);
  }
}
