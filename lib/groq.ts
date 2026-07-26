import { EXERCISES, exerciseCatalogForPrompt, findExercise } from "./exercises";
import {
  PrescribedExercise,
  PrescribedSession,
  ProgramState,
  UserProfile,
  WorkoutSession,
} from "./types";
import { computeNextProgramState, generateWeeklyProgram, initialProgramState } from "./programGenerator";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function groqChat(messages: ChatMessage[], temperature = 0.3): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq request failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned an empty response");
  return content;
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Could not parse Groq JSON");
  }
}

function sanitizeExercise(raw: unknown): PrescribedExercise | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const exerciseId = String(e.exerciseId ?? "");
  if (!findExercise(exerciseId)) return null;
  const sets = Number(e.sets);
  const reps = Number(e.reps);
  const targetWeightKg = Number(e.targetWeightKg ?? 0);
  const restSeconds = Number(e.restSeconds ?? 60);
  if (!Number.isFinite(sets) || !Number.isFinite(reps)) return null;
  return {
    exerciseId,
    sets: Math.max(1, Math.min(8, Math.round(sets))),
    reps: Math.max(1, Math.min(50, Math.round(reps))),
    targetWeightKg: Math.max(0, Math.round(targetWeightKg)),
    restSeconds: Math.max(15, Math.min(300, Math.round(restSeconds))),
  };
}

function sanitizeWeeklyTemplate(raw: unknown, fallbackDays: number): PrescribedSession[] | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const sessions = Array.isArray(obj.weeklyTemplate)
    ? obj.weeklyTemplate
    : Array.isArray(obj.sessions)
      ? obj.sessions
      : null;
  if (!sessions || sessions.length === 0) return null;

  const cleaned: PrescribedSession[] = [];
  for (const session of sessions) {
    if (!session || typeof session !== "object") continue;
    const s = session as Record<string, unknown>;
    const exercisesRaw = Array.isArray(s.exercises) ? s.exercises : [];
    const exercises = exercisesRaw
      .map(sanitizeExercise)
      .filter((e): e is PrescribedExercise => e != null);
    if (exercises.length === 0) continue;
    cleaned.push({
      focus: typeof s.focus === "string" && s.focus.trim() ? s.focus.trim() : "Training day",
      exercises,
    });
  }

  if (cleaned.length === 0) return null;
  // Keep length aligned with the user's days/week when possible.
  if (cleaned.length > fallbackDays) return cleaned.slice(0, fallbackDays);
  return cleaned;
}

function profileSummary(profile: UserProfile): string {
  return JSON.stringify(
    {
      goals: profile.goals,
      experienceLevel: profile.experienceLevel,
      daysPerWeek: profile.daysPerWeek,
      sessionLengthMin: profile.sessionLengthMin,
      equipment: profile.equipment,
      injuries: profile.injuries,
      targetMuscleGroups: profile.targetMuscleGroups,
      planLengthWeeks: profile.planLengthWeeks,
      bodyweightKg: profile.bodyweightKg ?? null,
      maxPushups: profile.maxPushups ?? 0,
      maxPullups: profile.maxPullups ?? 0,
      maxSitups: profile.maxSitups ?? 0,
    },
    null,
    2
  );
}

/**
 * Ask Groq to build the initial weekly template from the intake profile.
 * Falls back to the deterministic local generator if Groq is unavailable
 * or returns invalid exercise ids.
 */
export async function generateProgramWithGroq(profile: UserProfile): Promise<ProgramState> {
  const fallback = initialProgramState(profile);

  if (!process.env.GROQ_API_KEY) {
    return fallback;
  }

  try {
    const content = await groqChat([
      {
        role: "system",
        content: `You are FitTrack's strength coach. Build a weekly training program as JSON only.
Rules:
- Use ONLY exercise ids from the catalog. Never invent ids.
- Respect equipment and injuries.
- Use maxPushups/maxPullups/maxSitups to set working-set reps for pushups, pullups/chinups, and situps/core (about 50-70% of max per set).
- Emphasize targetMuscleGroups with accessory work when session length allows.
- daysPerWeek sessions, each with a short focus string and 3-8 exercises.
- Bodyweight-only moves should have targetWeightKg: 0.
- Respond with JSON shape: {"weeklyTemplate":[{"focus":"string","exercises":[{"exerciseId":"id","sets":n,"reps":n,"targetWeightKg":n,"restSeconds":n}]}]}`,
      },
      {
        role: "user",
        content: `Athlete profile:\n${profileSummary(profile)}\n\nExercise catalog (id|name|muscle|pattern|accessory|equipment):\n${exerciseCatalogForPrompt()}`,
      },
    ]);

    const parsed = extractJson(content);
    const template = sanitizeWeeklyTemplate(parsed, profile.daysPerWeek);
    if (!template) return fallback;

    return {
      ...fallback,
      weeklyTemplate: template,
    };
  } catch (err) {
    console.error("generateProgramWithGroq failed, using local generator:", err);
    return fallback;
  }
}

/**
 * After a session, ask Groq to adjust the remaining weekly template using
 * free-text feedback. Falls back to the local overload engine.
 */
export async function adjustProgramWithGroq(params: {
  profile: UserProfile;
  currentState: ProgramState;
  session: WorkoutSession;
  history: WorkoutSession[];
}): Promise<ProgramState> {
  const { profile, currentState, session, history } = params;
  const localNext = computeNextProgramState(currentState, session, profile, history);

  const feedback = session.feedback;
  const hasText =
    Boolean(feedback?.wentWell?.trim()) || Boolean(feedback?.toImprove?.trim());

  if (!hasText || !process.env.GROQ_API_KEY) {
    return localNext;
  }

  try {
    const content = await groqChat([
      {
        role: "system",
        content: `You are FitTrack's adaptive coach. Given the current weekly program and the athlete's post-workout feedback, return an updated weeklyTemplate as JSON.
Rules:
- Use ONLY exercise ids from the catalog.
- Keep the same number of training days as the current template.
- Apply feedback concretely (e.g. "shoulders too sore" → swap/reduce shoulder volume; "pullups felt easy" → add reps or a harder pull variation).
- Preserve progressive structure; do not wipe the whole plan unless feedback demands it.
- Advance currentDayIndex to the next day (wrap to 0).
- Respond with JSON: {"weeklyTemplate":[...],"coachNote":"short string explaining changes","isDeloadWeek":false,"deloadReason":null}`,
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            profile: {
              goals: profile.goals,
              experienceLevel: profile.experienceLevel,
              equipment: profile.equipment,
              injuries: profile.injuries,
              targetMuscleGroups: profile.targetMuscleGroups,
              maxPushups: profile.maxPushups ?? 0,
              maxPullups: profile.maxPullups ?? 0,
              maxSitups: profile.maxSitups ?? 0,
            },
            currentState: {
              weekNumber: currentState.weekNumber,
              currentDayIndex: currentState.currentDayIndex,
              weeklyTemplate: currentState.weeklyTemplate,
              isDeloadWeek: currentState.isDeloadWeek,
            },
            justCompletedSession: {
              effortRating: session.effortRating ?? null,
              sets: session.exercises,
              feedback: {
                wentWell: feedback?.wentWell ?? "",
                toImprove: feedback?.toImprove ?? "",
              },
            },
            localEngineSuggestion: {
              note: "Use as a baseline if helpful; you may override based on feedback.",
              weeklyTemplate: localNext.weeklyTemplate,
              currentDayIndex: localNext.currentDayIndex,
              isDeloadWeek: localNext.isDeloadWeek,
              deloadReason: localNext.deloadReason ?? null,
            },
            exerciseCatalog: EXERCISES.map((e) => e.id),
          },
          null,
          2
        ),
      },
    ]);

    const parsed = extractJson(content) as Record<string, unknown>;
    const template = sanitizeWeeklyTemplate(parsed, currentState.weeklyTemplate.length);
    if (!template) return localNext;

    const nextDayIndex = (currentState.currentDayIndex + 1) % template.length;
    const wrappedToNewWeek = nextDayIndex === 0;
    const coachNote = typeof parsed.coachNote === "string" ? parsed.coachNote : undefined;
    const isDeloadWeek = Boolean(parsed.isDeloadWeek) || localNext.isDeloadWeek;
    const deloadReason =
      typeof parsed.deloadReason === "string" && parsed.deloadReason
        ? parsed.deloadReason
        : coachNote || localNext.deloadReason;

    return {
      planLengthWeeks: currentState.planLengthWeeks,
      weekNumber: wrappedToNewWeek ? currentState.weekNumber + 1 : currentState.weekNumber,
      weeklyTemplate: template,
      currentDayIndex: nextDayIndex,
      isDeloadWeek,
      deloadReason,
      trailingVolumeLoad: localNext.trailingVolumeLoad,
      lastVolumeLoad: localNext.lastVolumeLoad,
    };
  } catch (err) {
    console.error("adjustProgramWithGroq failed, using local engine:", err);
    return localNext;
  }
}

/** Exported for tests / callers that only need the deterministic path. */
export { generateWeeklyProgram };
