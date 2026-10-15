import { NextResponse } from "next/server";
import { ServiceError } from "@/lib/service";

export function jsonError(error: unknown) {
  if (error instanceof ServiceError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[brief]", error);
  return NextResponse.json({ error: "Something went wrong on the desk." }, { status: 500 });
}
