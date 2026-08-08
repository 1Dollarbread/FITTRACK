import { EXERCISES, exerciseCatalogForPrompt, findExercise } from "./exercises";
import { getExerciseFormInfo } from "./exerciseMedia";
import {
  PrescribedExercise,
  PrescribedSession,
  ProgramState,
  SessionBriefing,
  UserProfile,
  WorkoutSession,
} from "./types";
import {
  computeNextProgramState,
  computeVolumeLoad,
  generateWeeklyProgram,
  initialProgramState,
} from "./programGenerator";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

let groqKeyIndex = 0;

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function getGroqApiKeys(): string[] {
  return [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_3]
    .filter((value): value is string => Boolean(value && value.trim()));
}

function getNextGroqApiKey(): string {
  const keys = getGroqApiKeys();
  if (keys.length === 0) {
    throw new Error("No GROQ API keys are configured");
  }
  const key = keys[groqKeyIndex % keys.length];
  groqKeyIndex += 1;
  return key;
}

async function groqChat(
  messages: ChatMessage[],
  temperature = 0.3,
  responseFormat?: Record<string, unknown>
): Promise<string> {
  const apiKey = getNextGroqApiKey();
  const payload: Record<string, unknown> = {
    model: GROQ_MODEL,
    temperature,
    messages,
  };
  if (responseFormat) {
    payload.response_format = responseFormat;
  }

  async function requestBody(body: Record<string, unknown>): Promise<string> {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Groq request failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Groq returned an empty response");
    return content;
  }

  try {
    return await requestBody(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (responseFormat && /json_object|response_format|messages must contain the word 'json'/i.test(message)) {
      console.warn("Groq response_format rejected; retrying without response_format", message);
      const fallbackPayload = { ...payload };
      delete fallbackPayload.response_format;
      return await requestBody(fallbackPayload);
    }
    throw err;
  }
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
  if (cleaned.length !== fallbackDays) return null;
  return cleaned;
}

function profileSummary(profile: UserProfile): string {
  const onboardingNotes = (profile.specificGoals ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  return JSON.stringify(
    {
      goals: profile.goals,
      experienceLevel: profile.experienceLevel,
      daysPerWeek: profile.daysPerWeek,
      sessionLengthMin: profile.sessionLengthMin,
      equipment: profile.equipment,
      injuries: profile.injuries,
      targetMuscleGroups: profile.targetMuscleGroups,
      focusAreas: profile.focusAreas ?? [],
      planLengthWeeks: profile.planLengthWeeks,
      bodyweightKg: profile.bodyweightKg ?? null,
      maxPushups: profile.maxPushups ?? "unknown",
      maxPullups: profile.maxPullups ?? "unknown",
      maxSitups: profile.maxSitups ?? "unknown",
      onboardingAnswers: onboardingNotes,
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

  if (getGroqApiKeys().length === 0) {
    return fallback;
  }

  try {
    const content = await groqChat(
      [
        {
          role: "system",
          content: `You are FitTrack's strength coach. Build a weekly training program as JSON only.
Rules:
- Use ONLY exercise ids from the catalog. Never invent ids.
- Treat the athlete profile as the primary source of truth. Use every onboarding answer in the profile, especially goals, benchmarks, injuries, schedule, equipment, recovery, nutrition, pain points, dislikes, preferred time, and any coaching preferences.
- Respect equipment and injuries first; avoid exercises that aggravate reported pain or conflicts.
- Use maxPushups/maxPullups/maxSitups to set working-set reps for pushups, pullups/chinups, and situps/core (about 50-70% of max per set), but if any benchmark is unknown, avoid inventing a value and use a conservative default.
- Emphasize targetMuscleGroups and focusAreas with accessory work when session length allows.
- Build daysPerWeek sessions, each with a short focus string and 3-8 exercises.
- If the athlete has onboarding answers about deadlines, success, preferred time, training history, activities, or enjoyment, weave those into the plan as explicit emphasis without losing the base goals.
- Prefer a slightly fuller template when the athlete has 4+ training days, aiming for 6-8 sessions when the user has 6 days per week and at least 6 sessions for a 6-day split.
- Bodyweight-only moves should have targetWeightKg: 0.
- Return JSON only.
- Respond with JSON shape: {"weeklyTemplate":[{"focus":"string","exercises":[{"exerciseId":"id","sets":n,"reps":n,"targetWeightKg":n,"restSeconds":n}]}]}`,
        },
        {
          role: "user",
          content: `Athlete profile:\n${profileSummary(profile)}\n\nExercise catalog (id|name|muscle|pattern|accessory|equipment):\n${exerciseCatalogForPrompt()}\n\nReturn JSON only.`,
        },
      ],
      0.3,
      { type: "json_object" }
    );
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
export async function generateCoachBriefing(
  profile: UserProfile,
  sessionFocus: string,
  sessionExercises?: Array<{ focus?: string; exercises?: Array<{ exerciseId?: string; sets?: number; reps?: number }> }>
): Promise<string> {
  const fallback = `Coach here. Today’s focus is ${sessionFocus}. Keep your form tight, stay consistent, and work at a level that lets you finish strong.`;

  if (getGroqApiKeys().length === 0) {
    return fallback;
  }

  try {
    const content = await groqChat([
      {
        role: "system",
        content: `You are FitTrack's supportive coach. Write a short spoken briefing for the start of a workout. Keep it under 60 words, motivational, and specific to the day's focus. Mention the main goal, what should feel worked or mildly sore, and one important coaching cue. Use the athlete profile context, especially their goals, recovery state, constraints, and preferences. Return plain text only.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          profile: {
            goals: profile.goals,
            specificGoals: profile.specificGoals ?? null,
            focusAreas: profile.focusAreas ?? [],
            experienceLevel: profile.experienceLevel,
            equipment: profile.equipment,
            injuries: profile.injuries,
            targetMuscleGroups: profile.targetMuscleGroups,
            maxPushups: profile.maxPushups ?? "unknown",
            maxPullups: profile.maxPullups ?? "unknown",
            maxSitups: profile.maxSitups ?? "unknown",
          },
          sessionFocus,
          upcomingExercises: sessionExercises?.map((entry) => ({
            focus: entry.focus ?? sessionFocus,
            exercises: (entry.exercises ?? []).map((exercise) => ({
              id: exercise.exerciseId ?? "unknown",
              sets: exercise.sets ?? null,
              reps: exercise.reps ?? null,
            })),
          })) ?? [],
        }),
      },
    ], 0.4);

    const trimmed = content.trim();
    return trimmed || fallback;
  } catch (err) {
    console.error("generateCoachBriefing failed, using fallback:", err);
    return fallback;
  }
}

export async function generatePlanSummary(profile: UserProfile): Promise<string> {
  const fallback = `Your plan is built around ${profile.goals.join(", ")} with ${profile.daysPerWeek} training day${profile.daysPerWeek === 1 ? "" : "s"} per week, tuned to your equipment, schedule, and recovery.`;

  if (getGroqApiKeys().length === 0) {
    return fallback;
  }

  try {
    const content = await groqChat([
      {
        role: "system",
        content: `You are FitTrack's planning assistant. Write one short sentence that summarizes what the athlete wants from the plan and how the program will support them. Mention their main goals, constraints, and priorities in a natural, motivating way. Return plain text only.`,
      },
      {
        role: "user",
        content: profileSummary(profile),
      },
    ], 0.35);

    const trimmed = content.trim();
    return trimmed || fallback;
  } catch (err) {
    console.error("generatePlanSummary failed, using fallback:", err);
    return fallback;
  }
}

export async function generateProgramAndCoachBriefing(profile: UserProfile): Promise<{
  program: ProgramState;
  coachBriefing: string;
  planSummary: string;
}> {
  const [program, coachBriefing, planSummary] = await Promise.all([
    generateProgramWithGroq(profile),
    generateCoachBriefing(profile, "your first week of training"),
    generatePlanSummary(profile),
  ]);

  return { program, coachBriefing, planSummary };
}

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
              specificGoals: profile.specificGoals ?? null,
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

function sessionAverageRpe(session: WorkoutSession): number | null {
  const rpes = session.exercises.map((s) => s.rpe).filter((r): r is number => r != null);
  if (rpes.length > 0) return rpes.reduce((a, b) => a + b, 0) / rpes.length;
  if (session.effortRating) return { easy: 5, medium: 7, hard: 9 }[session.effortRating];
  return null;
}

function averageVolumeLoad(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;
  return sessions.reduce((sum, s) => sum + computeVolumeLoad(s), 0) / sessions.length;
}

function sanitizeBriefing(raw: unknown): SessionBriefing | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;

  const formCues = Array.isArray(b.formCues)
    ? b.formCues
        .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
        .map((c) => c.trim())
        .slice(0, 4)
    : [];
  const whatToExpect = typeof b.whatToExpect === "string" ? b.whatToExpect.trim() : "";
  const afterFeeling = typeof b.afterFeeling === "string" ? b.afterFeeling.trim() : "";

  if (formCues.length === 0 || !whatToExpect || !afterFeeling) return null;
  return { formCues, whatToExpect, afterFeeling };
}

const GOAL_AFTER_FEELING: Record<string, string> = {
  strength: "Expect the muscles you loaded today to feel fatigued but not wrecked — some next-day stiffness is normal. Sharp or joint pain isn't; stop and rest instead if you feel that.",
  hypertrophy: "Expect noticeable soreness (DOMS) in the areas you targeted today, peaking 24-48 hours out — that's normal muscle adaptation, not injury.",
  fat_loss: "Expect to feel warm and a little breathless during the session and pleasantly tired afterward — that fatigue should clear up within a day.",
  endurance: "Expect steady, whole-body fatigue rather than sharp muscle soreness — energy should be back to normal well before your next session.",
  general_health: "Expect mild, general tiredness after today's session, easing off within a day or so.",
};

/**
 * Deterministic, no-network briefing. Used when Groq is unavailable or
 * returns something malformed — the athlete should never see a blank
 * screen before starting a session.
 */
export function localSessionBriefing(params: {
  profile: UserProfile;
  session: PrescribedSession;
  history: WorkoutSession[];
  isDeloadWeek: boolean;
  deloadReason?: string;
}): SessionBriefing {
  const { profile, session, history, isDeloadWeek, deloadReason } = params;

  const formCues = session.exercises
    .map((ex) => {
      const def = findExercise(ex.exerciseId);
      const info = getExerciseFormInfo(ex.exerciseId);
      const cue = info?.details[0] ?? info?.instructions;
      return def && cue ? `${def.name}: ${cue}` : null;
    })
    .filter((c): c is string => c != null)
    .slice(0, 4);

  let whatToExpect: string;
  if (isDeloadWeek) {
    whatToExpect = deloadReason
      ? `This is a lighter week: ${deloadReason}`
      : "This is a lighter week — targets are pulled back on purpose so you come out of it fresher, not weaker.";
  } else if (history.length === 0) {
    whatToExpect = "This is your first logged session — today's numbers are the baseline the program will adapt from next time.";
  } else {
    const recent = history.slice(-3);
    const lastVolume = computeVolumeLoad(recent[recent.length - 1]);
    const priorVolume = averageVolumeLoad(recent.slice(0, -1));
    const rpe = sessionAverageRpe(recent[recent.length - 1]);
    const trendPhrase =
      priorVolume > 0 && lastVolume > priorVolume * 1.05
        ? "You've been trending up over your last few sessions, so today's targets are set slightly higher to match."
        : priorVolume > 0 && lastVolume < priorVolume * 0.95
          ? "Your recent volume has eased off a bit, so today's targets are dialed back to match how you've been recovering."
          : "Your recent sessions have been steady, so today's targets hold close to where you left off.";
    const effortPhrase = rpe != null && rpe >= 8.5 ? " Your last session ran hard, so expect today to feel challenging too." : "";
    whatToExpect = `${trendPhrase}${effortPhrase}`;
  }

  const primaryGoal = profile.goals[0] ?? "general_health";
  const afterFeeling = isDeloadWeek
    ? "This is a lighter week — you should finish feeling refreshed, not wrecked. Sharp or joint pain still isn't normal; stop and rest if you feel that."
    : GOAL_AFTER_FEELING[primaryGoal] ?? GOAL_AFTER_FEELING.general_health;

  return {
    formCues: formCues.length > 0 ? formCues : ["Move through a full, controlled range of motion on every set."],
    whatToExpect,
    afterFeeling,
  };
}

/**
 * Ask Groq for a short pre-session briefing: form cues for today's exercises,
 * what to expect based on recent performance, and what normal post-session
 * soreness should feel like. Falls back to the deterministic local briefing
 * if Groq is unavailable or returns something we can't parse.
 */
export async function getSessionBriefingWithGroq(params: {
  profile: UserProfile;
  session: PrescribedSession;
  history: WorkoutSession[];
  isDeloadWeek: boolean;
  deloadReason?: string;
}): Promise<SessionBriefing> {
  const { profile, session, history, isDeloadWeek, deloadReason } = params;
  const fallback = localSessionBriefing(params);

  if (!process.env.GROQ_API_KEY) {
    return fallback;
  }

  try {
    const recentHistory = history.slice(-5).map((s) => ({
      date: new Date(s.date).toISOString().slice(0, 10),
      volumeLoad: Math.round(computeVolumeLoad(s)),
      effortRating: s.effortRating ?? null,
      avgRpe: sessionAverageRpe(s),
      feedback: s.feedback ?? null,
    }));

    const content = await groqChat([
      {
        role: "system",
        content: `You are FitTrack's AI coach giving a short spoken-style briefing right before the athlete starts logging today's session. Respond with JSON only.
Rules:
- formCues: 2-4 short, specific form cues for TODAY's exercises only (name the exercise in each cue). Under 20 words each.
- whatToExpect: 1-2 sentences grounding today's targets in the athlete's actual recent performance/trend (volume, effort, feedback) — be concrete, not generic. If there's no history, say this is the baseline session.
- afterFeeling: 1-2 sentences on what normal post-session soreness/fatigue should feel like for a session like today's, and a brief note on what would NOT be normal (e.g. sharp or joint pain) and should mean stopping.
- Tone: encouraging and direct, like a coach talking before the set — not a medical disclaimer.
- Respond with JSON shape: {"formCues":["..."],"whatToExpect":"...","afterFeeling":"..."}`,
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            profile: {
              goals: profile.goals,
              experienceLevel: profile.experienceLevel,
              uiMode: profile.uiMode,
              streak: profile.streak ?? 0,
            },
            todaysSession: session,
            isDeloadWeek,
            deloadReason: deloadReason ?? null,
            recentHistory,
          },
          null,
          2
        ),
      },
    ],
    0.4,
    { type: "json_object" }
  );

    const parsed = extractJson(content);
    const briefing = sanitizeBriefing(parsed);
    return briefing ?? fallback;
  } catch (err) {
    console.error("getSessionBriefingWithGroq failed, using local briefing:", err);
    return fallback;
  }
}

/** Exported for tests / callers that only need the deterministic path. */
export { generateWeeklyProgram };
