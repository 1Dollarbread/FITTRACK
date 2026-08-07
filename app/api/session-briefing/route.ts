import { NextRequest, NextResponse } from "next/server";
import { PrescribedSession, UserProfile, WorkoutSession } from "@/lib/types";
import { getSessionBriefingWithGroq, localSessionBriefing } from "@/lib/groq";
import { verifyRequestAuth, httpErrorToResponse } from "@/lib/serverAuth";
import { sanitizePrescribedSession, sanitizeUserProfile, sanitizeWorkoutSession } from "@/lib/requestValidation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let authedUid: string | null = null;
  let profile: UserProfile | undefined;
  let session: PrescribedSession | undefined;

  try {
    // 1. Authenticate first — no work happens before this.
    const { uid } = await verifyRequestAuth(req);
    authedUid = uid;

    // 2. Parse and validate the body.
    const body = (await req.json()) as {
      profile?: unknown;
      session?: unknown;
      history?: unknown;
      isDeloadWeek?: unknown;
      deloadReason?: unknown;
    };
    const cleanedProfile = sanitizeUserProfile(body.profile, authedUid ?? undefined);
    profile = cleanedProfile ?? undefined;
    session = sanitizePrescribedSession(body.session) ?? undefined;
    const history = Array.isArray(body.history)
      ? body.history
          .map(sanitizeWorkoutSession)
          .filter((s): s is WorkoutSession => s != null)
      : [];
    const isDeloadWeek = Boolean(body.isDeloadWeek);
    const deloadReason = typeof body.deloadReason === "string" ? body.deloadReason : undefined;

    if (!profile?.uid || !session) {
      return NextResponse.json(
        { error: "profile and session are required and must be structurally valid" },
        { status: 400 }
      );
    }
    if (profile.uid !== authedUid) {
      return NextResponse.json(
        { error: "profile.uid does not match the authenticated user" },
        { status: 403 }
      );
    }

    // 3. Run the (potentially expensive) LLM call.
    const briefing = await getSessionBriefingWithGroq({
      profile,
      session,
      history,
      isDeloadWeek,
      deloadReason,
    });
    return NextResponse.json({ briefing });
  } catch (err) {
    // Auth errors should bubble as-is.
    const res = httpErrorToResponse(err);
    if (res.status === 401 || res.status === 403) return res;

    console.error("/api/session-briefing", err);
    // For authenticated callers with a valid session shape, fall back to the
    // deterministic local briefing so a Groq outage never blocks the workout.
    if (authedUid && profile?.uid === authedUid && session) {
      return NextResponse.json({
        briefing: localSessionBriefing({ profile, session, history: [], isDeloadWeek: false }),
        fallback: true,
      });
    }
    return NextResponse.json({ error: "Failed to generate session briefing" }, { status: 500 });
  }
}
