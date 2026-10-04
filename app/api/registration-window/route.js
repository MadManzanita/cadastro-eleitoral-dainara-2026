import { NextResponse } from "next/server";
import { COUNTDOWN_START, REGISTRATION_DEADLINE } from "../../../lib/registration-window.mjs";

export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({ now: Date.now(), start: COUNTDOWN_START, deadline: REGISTRATION_DEADLINE }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
