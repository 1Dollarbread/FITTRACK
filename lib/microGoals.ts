import { WorkoutSession, MicroGoal } from "./types";

// Adaptive Habit "Micro-Goals"
// Rather than prescribing a fixed habit, this looks at when a user actually
// shows up (time of day clusters in their session history) and proposes a
// tiny goal anchored to that real pattern, then scales it up only once a
// streak proves the habit has stuck.

const STARTER_LIBRARY: { context: string; text: string; targetMinutesOrReps: number }[] = [
  { context: "post-dinner", text: "Walk 5 minutes after dinner", targetMinutesOrReps: 5 },
  { context: "morning", text: "Do 1 set of mobility work right after waking up", targetMinutesOrReps: 1 },
  { context: "study break", text: "Do 1 set of bodyweight squats during a study break", targetMinutesOrReps: 1 },
  { context: "midday", text: "Take a 5 minute walk at lunch", targetMinutesOrReps: 5 },
];

function mostCommonHourBucket(sessions: WorkoutSession[]): string {
  const buckets = { morning: 0, midday: 0, "post-dinner": 0, "study break": 0 };
  for (const s of sessions) {
    const hour = new Date(s.date).getHours();
    if (hour < 11) buckets.morning++;
    else if (hour < 15) buckets.midday++;
    else if (hour >= 19) buckets["post-dinner"]++;
    else buckets["study break"]++;
  }
  return (Object.entries(buckets).sort((a, b) => b[1] - a[1])[0]?.[0]) ?? "post-dinner";
}

/** Called once there's enough session history to detect a real pattern (>= 3 sessions). */
export function suggestMicroGoal(sessions: WorkoutSession[]): Omit<MicroGoal, "id"> {
  const context = sessions.length >= 3 ? mostCommonHourBucket(sessions) : "post-dinner";
  const template =
    STARTER_LIBRARY.find((g) => g.context === context) ?? STARTER_LIBRARY[0];

  return {
    text: template.text,
    triggerContext: template.context,
    targetMinutesOrReps: template.targetMinutesOrReps,
    streak: 0,
    active: true,
  };
}

/** Scales a micro-goal up once the streak proves the habit has stuck — never before. */
export function maybeScaleUpGoal(goal: MicroGoal): MicroGoal {
  const SCALE_STREAK_THRESHOLD = 7;
  if (goal.streak < SCALE_STREAK_THRESHOLD) return goal;

  return {
    ...goal,
    id: `${goal.id}_scaled`,
    text: goal.text.replace(
      /\d+/,
      (n) => String(Math.round(parseInt(n, 10) * 1.5))
    ),
    targetMinutesOrReps: Math.round(goal.targetMinutesOrReps * 1.5),
    streak: 0,
    scaledFrom: goal.id,
  };
}
