import { NextRequest, NextResponse } from "next/server";
import { ProgramState, UserProfile, WorkoutSession } from "@/lib/types";
import { adjustProgramWithGroq } from "@/lib/groq";
import { computeNextProgramState } from "@/lib/programGenerator";
import { updateStreakOnSession, localDateKey } from "@/lib/streaks";
import { verifyRequestAuth, httpErrorToResponse } from "@/lib/serverAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let authedUid: string | null = null;
  let profile: UserProfile | undefined;
  let currentState: ProgramState | undefined;
  let session: WorkoutSession | undefined;
  let history: WorkoutSession[] = [];

  try {
    // 1. Authenticate first.
    const { uid } = await verifyRequestAuth(req);
    authedUid = uid;

    // 2. Parse and validate.
    const body = (await req.json()) as {
      profile?: UserProfile;
      currentState?: ProgramState;
      session?: WorkoutSession;
      history?: WorkoutSession[];
      /** Client local calendar day `YYYY-MM-DD` — used so timezone matches the athlete. */
      clientLocalDate?: string;
    };
    profile = body.profile;
    currentState = body.currentState;
    session = body.session;
    history = body.history ?? [];

    if (!profile || !currentState || !session) {
      return NextResponse.json(
        { error: "profile, currentState, and session are required" },
        { status: 400 }
      );
    }
    // 3. The session must belong to the authenticated user — otherwise one
    //    user could write another user's history to the engine.
    if (profile.uid !== authedUid) {
      return NextResponse.json(
        { error: "profile.uid does not match the authenticated user" },
        { status: 403 }
      );
    }

    // 4. One completed session per local calendar day — blocks streak farming
    //    and skipping ahead in the weekly template.
    const dayKey =
      typeof body.clientLocalDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.clientLocalDate)
        ? body.clientLocalDate
        : localDateKey(new Date());
    if (profile.lastStreakDay === dayKey) {
      return NextResponse.json(
        {
          error: "You already completed a session today. Come back tomorrow to continue your program.",
          alreadyCompletedToday: true,
        },
        { status: 409 }
      );
    }

    const program = await adjustProgramWithGroq({
      profile,
      currentState,
      session,
      history,
    });
    // Server-authoritative streak update. The client cannot self-increment.
    const streakUpdate = updateStreakOnSession(profile, new Date());
    const updatedProfile: UserProfile = {
      ...profile,
      streak: streakUpdate.streak,
      lastStreakDay: streakUpdate.lastStreakDay,
    };
    return NextResponse.json({ program, profile: updatedProfile });
  } catch (err) {
    const res = httpErrorToResponse(err);
    if (res.status === 401 || res.status === 403) return res;

    console.error("/api/adjust-program", err);
    if (authedUid && profile?.uid === authedUid && currentState && session) {
      const fallbackProgram = computeNextProgramState(currentState, session, profile, history);
      const streakUpdate = updateStreakOnSession(profile, new Date());
      const updatedProfile: UserProfile = {
        ...profile,
        streak: streakUpdate.streak,
        lastStreakDay: streakUpdate.lastStreakDay,
      };
      return NextResponse.json({
        program: fallbackProgram,
        profile: updatedProfile,
        fallback: true,
      });
    }
    return NextResponse.json({ error: "Failed to adjust program" }, { status: 500 });
  }
}
