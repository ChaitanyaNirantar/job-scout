import { NextResponse } from "next/server";
import { jsonError } from "@/lib/route";
import { createWatch } from "@/lib/service";
import type { WatchInput } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as WatchInput;
    const result = await createWatch(body);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
