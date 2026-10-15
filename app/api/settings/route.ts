import { NextResponse } from "next/server";
import { jsonError } from "@/lib/route";
import { updateSettings } from "@/lib/service";
import type { Settings } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Partial<Settings>;
    return NextResponse.json({ state: await updateSettings(body) });
  } catch (error) {
    return jsonError(error);
  }
}
