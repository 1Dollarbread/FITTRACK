import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeUserProfile, sanitizeWorkoutSession } from "./requestValidation.ts";

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
