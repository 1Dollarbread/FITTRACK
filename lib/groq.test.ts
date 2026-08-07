import test from "node:test";
import assert from "node:assert/strict";
import { localSessionBriefing } from "./groq.ts";
import { PrescribedSession, UserProfile, WorkoutSession } from "./types.ts";

function baseProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: "user-1",
    displayName: "Athlete",
    uiMode: "beginner",
    goals: ["hypertrophy"],
    experienceLevel: "beginner",
    daysPerWeek: 3,
    sessionLengthMin: 45,
    equipment: ["dumbbells", "bodyweight_only"],
    injuries: [],
    targetMuscleGroups: [],
    planLengthWeeks: 8,
    subscriptionTier: "free",
    createdAt: Date.now(),
    ...overrides,
  };
}

const pushDay: PrescribedSession = {
  focus: "Push day",
  exercises: [
    { exerciseId: "bench_press", sets: 4, reps: 8, targetWeightKg: 60, restSeconds: 90 },
    { exerciseId: "pushup", sets: 3, reps: 12, targetWeightKg: 0, restSeconds: 60 },
  ],
};

function session(volumeLoad: number, date: number): WorkoutSession {
  // One set whose reps*weight equals the desired volume load, for a simple, readable fixture.
  return {
    id: `s-${date}`,
    date,
    exercises: [{ exerciseId: "bench_press", setNumber: 1, reps: 1, weightKg: volumeLoad }],
    loggedVia: "manual",
  };
}

test("localSessionBriefing gives a baseline message with no history", () => {
  const briefing = localSessionBriefing({
    profile: baseProfile(),
    session: pushDay,
    history: [],
    isDeloadWeek: false,
  });

  assert.match(briefing.whatToExpect, /first logged session/i);
  assert.ok(briefing.formCues.length > 0 && briefing.formCues.length <= 4);
  assert.ok(briefing.formCues.every((c) => typeof c === "string" && c.length > 0));
});

test("localSessionBriefing surfaces the deload reason when the program is deloading", () => {
  const briefing = localSessionBriefing({
    profile: baseProfile(),
    session: pushDay,
    history: [session(100, 1), session(100, 2), session(100, 3)],
    isDeloadWeek: true,
    deloadReason: "Volume has stalled while effort stayed high.",
  });

  assert.match(briefing.whatToExpect, /Volume has stalled/);
  assert.match(briefing.afterFeeling, /lighter week/i);
});

test("localSessionBriefing notes an upward trend when recent volume is rising", () => {
  const briefing = localSessionBriefing({
    profile: baseProfile(),
    session: pushDay,
    history: [session(100, 1), session(105, 2), session(140, 3)],
    isDeloadWeek: false,
  });

  assert.match(briefing.whatToExpect, /trending up/i);
});

test("localSessionBriefing picks after-feeling guidance from the athlete's primary goal", () => {
  const briefing = localSessionBriefing({
    profile: baseProfile({ goals: ["endurance"] }),
    session: pushDay,
    history: [],
    isDeloadWeek: false,
  });

  assert.match(briefing.afterFeeling, /whole-body fatigue/i);
});

test("localSessionBriefing form cues name today's exercises", () => {
  const briefing = localSessionBriefing({
    profile: baseProfile(),
    session: pushDay,
    history: [],
    isDeloadWeek: false,
  });

  assert.ok(briefing.formCues.some((c) => c.startsWith("Barbell Bench Press:")));
});
