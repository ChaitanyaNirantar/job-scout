import { NextResponse } from "next/server";
import { jsonError } from "@/lib/route";
import { deleteWatch, updateWatch } from "@/lib/service";
import type { WatchInput } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as WatchInput;
    return NextResponse.json(await updateWatch(id, body));
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return NextResponse.json({ state: await deleteWatch(id) });
  } catch (error) {
    return jsonError(error);
  }
}
