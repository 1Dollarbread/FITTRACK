import { NextRequest, NextResponse } from "next/server";
import { verifyRequestAuth, httpErrorToResponse } from "@/lib/serverAuth";
import { sanitizeUserProfile } from "@/lib/requestValidation";
import { generateCoachBriefing } from "@/lib/groq";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await verifyRequestAuth(req);
    const body = (await req.json()) as { profile?: unknown; sessionFocus?: unknown; sessionExercises?: unknown };
    const profile = sanitizeUserProfile(body.profile, uid);
    const sessionFocus = typeof body.sessionFocus === "string" ? body.sessionFocus.trim() : "your workout";
    const sessionExercises = Array.isArray(body.sessionExercises) ? body.sessionExercises : undefined;

    if (!profile) {
      return NextResponse.json({ error: "profile is required and must be structurally valid" }, { status: 400 });
    }

    const briefing = await generateCoachBriefing(profile, sessionFocus, sessionExercises as Array<{ focus?: string; exercises?: Array<{ exerciseId?: string; sets?: number; reps?: number }> }> | undefined);
    return NextResponse.json({ briefing });
  } catch (err) {
    const res = httpErrorToResponse(err);
    if (res.status === 401 || res.status === 403) return res;
    console.error("/api/coach-briefing", err);
    return NextResponse.json({ error: "Failed to generate coach briefing" }, { status: 500 });
  }
}
