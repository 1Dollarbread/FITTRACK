import test from "node:test";
import assert from "node:assert/strict";
import { sanitizePrescribedSession, sanitizeUserProfile, sanitizeWorkoutSession } from "./requestValidation";

test("sanitizeUserProfile rejects malformed and out-of-range data", () => {
  const invalid = sanitizeUserProfile(
    {
      uid: "user-123",
      displayName: "  ",
      uiMode: "novice",
      goals: ["strength", "hacker"],
      experienceLevel: "beginner",
      daysPerWeek: 8,
      sessionLengthMin: 5,
      equipment: ["full_gym", "mystery"],
      injuries: [{ bodyPart: "", severity: "mild" }],
      maxPushups: -1,
      targetMuscleGroups: ["chest"],
      planLengthWeeks: 6,
      subscriptionTier: "free",
      createdAt: -1,
    },
    "user-123"
  );

  assert.equal(invalid, null);
});

test("sanitizeWorkoutSession strips malformed set data", () => {
  const cleaned = sanitizeWorkoutSession({
    id: "session-1",
    date: Date.now(),
    exercises: [
      { exerciseId: "bench_press", setNumber: 1, reps: 8, weightKg: 60, rpe: 8 },
      { exerciseId: "", setNumber: 0, reps: 0, weightKg: -1 },
    ],
    loggedVia: "manual",
    feedback: { wentWell: "Great", toImprove: "" },
  });

  assert.equal(cleaned?.exercises.length, 1);
  assert.equal(cleaned?.exercises[0]?.exerciseId, "bench_press");
  assert.equal(cleaned?.feedback?.wentWell, "Great");
});

test("sanitizeWorkoutSession accepts time-based set logs", () => {
  const cleaned = sanitizeWorkoutSession({
    id: "session-2",
    date: Date.now(),
    exercises: [
      { exerciseId: "plank", setNumber: 1, reps: 0, seconds: 45, weightKg: 0 },
    ],
    loggedVia: "manual",
  });

  assert.ok(cleaned);
  assert.equal(cleaned?.exercises[0]?.seconds, 45);
  assert.equal(cleaned?.exercises[0]?.reps, 0);
});

test("sanitizeUserProfile preserves trimmed specific goals", () => {
  const cleaned = sanitizeUserProfile(
    {
      uid: "user-123",
      displayName: "Ava",
      uiMode: "beginner",
      goals: ["strength"],
      experienceLevel: "beginner",
      daysPerWeek: 4,
      sessionLengthMin: 45,
      equipment: ["dumbbells"],
      injuries: [],
      targetMuscleGroups: ["back"],
      planLengthWeeks: 8,
      subscriptionTier: "free",
      createdAt: Date.now(),
      specificGoals: "  Build a stronger upper body and recover faster  ",
    },
    "user-123"
  );

  assert.ok(cleaned);
  assert.equal(cleaned?.specificGoals, "Build a stronger upper body and recover faster");
});

test("sanitizeUserProfile preserves unknown benchmarks and focus areas", () => {
  const cleaned = sanitizeUserProfile(
    {
      uid: "user-123",
      displayName: "Ava",
      uiMode: "beginner",
      goals: ["strength"],
      experienceLevel: "beginner",
      daysPerWeek: 4,
      sessionLengthMin: 45,
      equipment: ["dumbbells"],
      injuries: [],
      targetMuscleGroups: ["back"],
      planLengthWeeks: 8,
      subscriptionTier: "free",
      createdAt: Date.now(),
      focusAreas: [" pull-ups ", " core "],
    },
    "user-123"
  );

  assert.ok(cleaned);
  assert.equal(cleaned?.maxPushups, undefined);
  assert.equal(cleaned?.maxPullups, undefined);
  assert.equal(cleaned?.maxSitups, undefined);
  assert.deepEqual(cleaned?.focusAreas, ["pull-ups", "core"]);
});

test("sanitizePrescribedSession strips unknown exercises and rejects an empty result", () => {
  const cleaned = sanitizePrescribedSession({
    focus: "Push day",
    exercises: [
      { exerciseId: "bench_press", sets: 4, reps: 8, targetWeightKg: 60, restSeconds: 90 },
      { exerciseId: "not_a_real_exercise", sets: 3, reps: 10, targetWeightKg: 20, restSeconds: 60 },
    ],
  });

  assert.equal(cleaned?.exercises.length, 1);
  assert.equal(cleaned?.exercises[0]?.exerciseId, "bench_press");

  const empty = sanitizePrescribedSession({
    focus: "Push day",
    exercises: [{ exerciseId: "not_a_real_exercise", sets: 3, reps: 10, targetWeightKg: 20, restSeconds: 60 }],
  });
  assert.equal(empty, null);
});

test("sanitizePrescribedSession rejects a missing focus", () => {
  const cleaned = sanitizePrescribedSession({
    exercises: [{ exerciseId: "bench_press", sets: 4, reps: 8, targetWeightKg: 60, restSeconds: 90 }],
  });
  assert.equal(cleaned, null);
});
