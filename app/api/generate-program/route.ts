import { NextRequest, NextResponse } from "next/server";
import { UserProfile } from "@/lib/types";
import { generateProgramWithGroq } from "@/lib/groq";
import { initialProgramState } from "@/lib/programGenerator";
import { verifyRequestAuth, httpErrorToResponse } from "@/lib/serverAuth";
import { sanitizeUserProfile } from "@/lib/requestValidation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let authedUid: string | null = null;
  let profile: UserProfile | undefined;

  try {
    // 1. Authenticate first — no work happens before this.
    const { uid } = await verifyRequestAuth(req);
    authedUid = uid;

    // 2. Parse and validate the body.
    const body = (await req.json()) as { profile?: unknown };
    const cleanedProfile = sanitizeUserProfile(body.profile, authedUid ?? undefined);
    profile = cleanedProfile ?? undefined;
    if (!profile?.uid) {
      return NextResponse.json({ error: "profile is required and must be structurally valid" }, { status: 400 });
    }
    if (profile.uid !== authedUid) {
      return NextResponse.json(
        { error: "profile.uid does not match the authenticated user" },
        { status: 403 }
      );
    }

    // 3. Run the (potentially expensive) LLM call.
    const program = await generateProgramWithGroq(profile);
    return NextResponse.json({ program });
  } catch (err) {
    // Auth errors should bubble as-is.
    const res = httpErrorToResponse(err);
    if (res.status === 401 || res.status === 403) return res;

    console.error("/api/generate-program", err);
    // For authenticated callers, fall back to the deterministic local generator
    // so onboarding still succeeds when Groq is unavailable.
    if (authedUid && profile?.uid === authedUid) {
      return NextResponse.json({
        program: initialProgramState(profile),
        fallback: true,
      });
    }
    return NextResponse.json({ error: "Failed to generate program" }, { status: 500 });
  }
}
