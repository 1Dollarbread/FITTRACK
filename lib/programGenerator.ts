import { EXERCISES, findExercise, withImplicitBodyweight } from "./exercises";
import {
  UserProfile,
  WorkoutSession,
  PrescribedSession,
  PrescribedExercise,
  ProgramState,
  ExerciseDef,
  MuscleGroup,
} from "./types";

// ---------------------------------------------------------------------------
// 1. INITIAL PROGRAM GENERATION
// Builds a full weekly template (one PrescribedSession per training day),
// not just a single "today" session. Every choice is traceable back to a
// stated goal, equipment constraint, injury, or selected target muscle —
// nothing here is random.
// ---------------------------------------------------------------------------

/** Rep/intensity targets per goal. Starting points; the overload engine adjusts from here. */
const GOAL_PROFILES: Record<
  string,
  { sets: number; reps: number; restSeconds: number; loadPctOfBodyweight: number }
> = {
  strength: { sets: 5, reps: 5, restSeconds: 150, loadPctOfBodyweight: 0.7 },
  hypertrophy: { sets: 4, reps: 10, restSeconds: 75, loadPctOfBodyweight: 0.5 },
  fat_loss: { sets: 3, reps: 15, restSeconds: 45, loadPctOfBodyweight: 0.35 },
  endurance: { sets: 3, reps: 15, restSeconds: 30, loadPctOfBodyweight: 0.3 },
  general_health: { sets: 3, reps: 10, restSeconds: 60, loadPctOfBodyweight: 0.4 },
};

/** Which movement patterns get trained on which day, keyed by days/week. */
const SPLITS: Record<number, string[][]> = {
  1: [["squat", "hinge", "push", "pull", "core"]],
  2: [
    ["squat", "push", "core"],
    ["hinge", "pull", "cardio"],
  ],
  3: [
    ["squat", "push", "core"],
    ["hinge", "pull", "cardio"],
    ["squat", "push", "pull", "core"],
  ],
  4: [
    ["squat", "push"],
    ["hinge", "pull"],
    ["push", "core"],
    ["pull", "cardio"],
  ],
  5: [
    ["squat"],
    ["push"],
    ["hinge"],
    ["pull"],
    ["core", "cardio"],
  ],
  6: [
    ["squat"],
    ["push"],
    ["hinge"],
    ["pull"],
    ["squat", "push"],
    ["hinge", "pull", "core"],
  ],
};

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function difficultyRank(level: string): number {
  return { new: 0, beginner: 1, intermediate: 2, advanced: 3 }[level] ?? 1;
}

function pickExerciseForPattern(
  pattern: string,
  profile: UserProfile,
  equipment: string[],
  exclude: Set<string>
): ExerciseDef | undefined {
  const injuredParts = profile.injuries
    .filter((i) => i.severity === "avoid_loading")
    .map((i) => i.bodyPart.toLowerCase());

  const candidates = EXERCISES.filter(
    (e) =>
      e.pattern === pattern &&
      !exclude.has(e.id) &&
      e.requiredEquipment.some((eq) => equipment.includes(eq)) &&
      !injuredParts.some(
        (part) =>
          e.muscleGroup.toLowerCase().includes(part) ||
          (e.secondaryMuscles ?? []).some((m) => m.toLowerCase().includes(part))
      )
  );

  if (candidates.length === 0) return undefined;

  const userRank = difficultyRank(profile.experienceLevel);
  candidates.sort(
    (a, b) =>
      Math.abs(difficultyRank(a.difficulty) - userRank) -
      Math.abs(difficultyRank(b.difficulty) - userRank)
  );
  return candidates[0];
}

/** Roughly how many total exercises fit in the session length available. */
function estimateExerciseSlots(sessionLengthMin: number): number {
  return Math.max(3, Math.min(8, Math.round(sessionLengthMin / 9)));
}

/** Weight guidance: bodyweight-only movements are reps-only (no load target). */
function targetWeightFor(ex: ExerciseDef, bodyweightKg: number, loadPct: number): number {
  const bodyweightOnly = ex.requiredEquipment.length === 1 && ex.requiredEquipment[0] === "bodyweight_only";
  if (bodyweightOnly) return 0;
  if (ex.requiredEquipment.includes("bands")) return 0; // band tension isn't a kg figure
  if (ex.isAccessory) return Math.round(bodyweightKg * loadPct * 0.4);
  return Math.round(bodyweightKg * loadPct);
}

/**
 * Scale bodyweight exercise reps from the user's max pushups / pullups / situps.
 * Working sets land around 50–70% of max so sessions are hard but completable.
 */
function repsForExercise(ex: ExerciseDef, profile: UserProfile, defaultReps: number): number {
  const clamp = (n: number) => Math.max(3, Math.min(30, Math.round(n)));
  if (ex.id === "pushup" || ex.id === "diamond_pushup" || ex.id === "pike_pushup") {
    if (profile.maxPushups && profile.maxPushups > 0) return clamp(profile.maxPushups * 0.6);
  }
  if (ex.id === "pullup" || ex.id === "chinup") {
    if (profile.maxPullups && profile.maxPullups > 0) {
      // Even 0–2 pullups still get a small working set; negatives/assisted live via swaps.
      return clamp(Math.max(3, profile.maxPullups * 0.65));
    }
  }
  if (ex.id === "situp" || ex.id === "bicycle_crunch" || ex.id === "hanging_leg_raise") {
    if (profile.maxSitups && profile.maxSitups > 0) return clamp(profile.maxSitups * 0.55);
  }
  if (ex.id === "sprint_60m" || ex.id === "sprint_100m") return 1; // each rep is one sprint; sets carries the sprint count
  if (ex.id === "mile_run") return 1; // always exactly one mile
  if (ex.id === "long_distance_run") return 3; // miles; mid-range of the 2-5 advanced-only band
  if (ex.id === "cardio_choice") return 20; // minutes
  return defaultReps;
}

/** Running/cardio work is a single continuous bout, not multiple training sets. */
function setsForExercise(ex: ExerciseDef, defaultSets: number): number {
  if (ex.id === "mile_run" || ex.id === "long_distance_run" || ex.id === "cardio_choice") return 1;
  return defaultSets;
}

/**
 * Builds the full weekly template right after onboarding.
 * Compound lifts cover the day's assigned movement patterns; remaining slots
 * (based on session length) are filled with accessory/isolation work for the
 * user's selected target muscle groups, rotating through the week so every
 * targeted muscle gets covered at least once even if it doesn't fit in one day.
 */
export function generateWeeklyProgram(profile: UserProfile): PrescribedSession[] {
  const days = Math.min(Math.max(profile.daysPerWeek, 1), 6);
  const split = SPLITS[days] ?? SPLITS[3];
  const splitForPlan = split;
  const equipment = withImplicitBodyweight(profile.equipment);
  const bodyweight = profile.bodyweightKg ?? 70;
  const totalSlots = estimateExerciseSlots(profile.sessionLengthMin);

  const goalConfigs = profile.goals.map((g) => GOAL_PROFILES[g] ?? GOAL_PROFILES.general_health);
  const blended = {
    sets: Math.round(avg(goalConfigs.map((g) => g.sets))),
    reps: Math.round(avg(goalConfigs.map((g) => g.reps))),
    restSeconds: Math.round(avg(goalConfigs.map((g) => g.restSeconds))),
    loadPctOfBodyweight: avg(goalConfigs.map((g) => g.loadPctOfBodyweight)),
  };

  // Tracks which target muscles have already gotten accessory volume this
  // week, so coverage spreads across days instead of stacking on day one.
  const coveredThisWeek = new Set<MuscleGroup>();
  const targets = profile.targetMuscleGroups.length ? profile.targetMuscleGroups : [];

  return splitForPlan.map((patternsToday) => {
    const usedIds = new Set<string>();
    const compoundExercises: PrescribedExercise[] = [];

    for (const pattern of patternsToday) {
      const ex = pickExerciseForPattern(pattern, profile, equipment, usedIds);
      if (!ex) continue;
      usedIds.add(ex.id);
      compoundExercises.push({
        exerciseId: ex.id,
        sets: setsForExercise(ex, blended.sets),
        reps: repsForExercise(ex, profile, blended.reps),
        targetWeightKg: targetWeightFor(ex, bodyweight, blended.loadPctOfBodyweight),
        restSeconds: blended.restSeconds,
      });
    }

    // Fill remaining slots with accessory work targeting the user's chosen
    // muscle groups, prioritizing muscles not yet covered this week.
    const remainingSlots = Math.max(0, totalSlots - compoundExercises.length);
    const accessoryExercises: PrescribedExercise[] = [];

    if (targets.length > 0 && remainingSlots > 0) {
      const priorityOrder = [...targets].sort((a, b) =>
        (coveredThisWeek.has(a) ? 1 : 0) - (coveredThisWeek.has(b) ? 1 : 0)
      );

      for (const muscle of priorityOrder) {
        if (accessoryExercises.length >= remainingSlots) break;
        const candidate = EXERCISES.filter(
          (e) =>
            e.isAccessory &&
            e.muscleGroup === muscle &&
            !usedIds.has(e.id) &&
            e.requiredEquipment.some((eq) => equipment.includes(eq))
        ).sort(
          (a, b) =>
            Math.abs(difficultyRank(a.difficulty) - difficultyRank(profile.experienceLevel)) -
            Math.abs(difficultyRank(b.difficulty) - difficultyRank(profile.experienceLevel))
        )[0];

        if (candidate) {
          usedIds.add(candidate.id);
          coveredThisWeek.add(muscle);
          accessoryExercises.push({
            exerciseId: candidate.id,
            sets: 3,
            reps: repsForExercise(candidate, profile, 12),
            targetWeightKg: targetWeightFor(candidate, bodyweight, blended.loadPctOfBodyweight),
            restSeconds: 45,
          });
        }
      }
    }

    const focusLabel = targets.length
      ? `${patternsToday.join(" + ")} — emphasis: ${accessoryExercises
          .map((a) => findExercise(a.exerciseId)?.muscleGroup)
          .filter(Boolean)
          .join(", ")}`
      : patternsToday.join(" + ");

    return {
      focus: focusLabel,
      exercises: [...compoundExercises, ...accessoryExercises],
    };
  });
}

// ---------------------------------------------------------------------------
// 2. VOLUME LOAD
// ---------------------------------------------------------------------------

export function computeVolumeLoad(session: WorkoutSession): number {
  return session.exercises.reduce((sum, s) => sum + s.reps * s.weightKg, 0);
}

function averageRpe(session: WorkoutSession): number | null {
  const rpes = session.exercises.map((s) => s.rpe).filter((r): r is number => r != null);
  if (rpes.length > 0) return avg(rpes);
  if (session.effortRating) {
    return { easy: 5, medium: 7, hard: 9 }[session.effortRating];
  }
  return null;
}

// ---------------------------------------------------------------------------
// 3. AUTO-DELOAD & INJURY PREVENTION
// ---------------------------------------------------------------------------

export function detectDeload(history: WorkoutSession[]): {
  shouldDeload: boolean;
  reason?: string;
} {
  if (history.length < 3) return { shouldDeload: false };

  const recent = history.slice(-3);
  const loads = recent.map(computeVolumeLoad);
  const rpes = recent.map(averageRpe).filter((r): r is number => r != null);

  const plateaued = loads[2] <= loads[0] * 1.02;
  const highEffort = rpes.length > 0 && avg(rpes) >= 8.5;
  if (plateaued && highEffort) {
    return {
      shouldDeload: true,
      reason:
        "Volume has stalled across your last 3 sessions while effort stayed high — time to back off before it becomes a plateau or an injury.",
    };
  }

  const recoveryScores = recent
    .map((s) => s.recoveryScore)
    .filter((r): r is NonNullable<typeof r> => r != null)
    .map((r) => r as number);
  if (recoveryScores.length === recent.length && avg(recoveryScores) <= 2) {
    return {
      shouldDeload: true,
      reason: "Your reported recovery has been low three sessions running — inserting a lighter week.",
    };
  }

  if (history.length >= 6) {
    const last3 = history.slice(-3).reduce((s, w) => s + computeVolumeLoad(w), 0);
    const prior3 = history.slice(-6, -3).reduce((s, w) => s + computeVolumeLoad(w), 0);
    if (prior3 > 0 && last3 / prior3 > 1.25) {
      return {
        shouldDeload: true,
        reason:
          "Volume jumped more than 25% versus your prior block — that ramp rate is a strong predictor of overuse injury, so we're smoothing it out.",
      };
    }
  }

  return { shouldDeload: false };
}

// ---------------------------------------------------------------------------
// 4. DYNAMIC PROGRESSIVE OVERLOAD ENGINE
// Adjusts the specific day just trained within the weekly template, then
// advances to the next day. Never random: every change is a direct function
// of reported RPE/effort, completed reps, and recovery.
// ---------------------------------------------------------------------------

export function computeNextProgramState(
  currentState: ProgramState,
  justTrainedSession: WorkoutSession,
  profile: UserProfile,
  history: WorkoutSession[]
): ProgramState {
  const deload = detectDeload(history);
  const lastVolumeLoad = computeVolumeLoad(justTrainedSession);
  const trailingVolumeLoad = avg(history.slice(-4).map(computeVolumeLoad));

  const trainedPrescription = currentState.weeklyTemplate[currentState.currentDayIndex];
  const rpe = averageRpe(justTrainedSession);

  const updatedDay: PrescribedSession = deload.shouldDeload
    ? {
        focus: trainedPrescription.focus + " (deload)",
        exercises: trainedPrescription.exercises.map((ex) => ({
          ...ex,
          sets: Math.max(2, ex.sets - 2),
          targetWeightKg: Math.round(ex.targetWeightKg * 0.6),
        })),
      }
    : {
        ...trainedPrescription,
        exercises: trainedPrescription.exercises.map((prescribed) => {
          if (prescribed.targetWeightKg === 0) return prescribed; // reps-only movement, nothing to load-adjust

          const loggedSets = justTrainedSession.exercises.filter(
            (s) => s.exerciseId === prescribed.exerciseId
          );
          const completedAllReps =
            loggedSets.length > 0 && loggedSets.every((s) => s.reps >= prescribed.reps);

          let nextWeight = prescribed.targetWeightKg;
          if (rpe !== null && rpe <= 6.5 && completedAllReps) {
            nextWeight = Math.round(prescribed.targetWeightKg * 1.05);
          } else if (rpe !== null && rpe <= 8 && completedAllReps) {
            nextWeight = Math.round(prescribed.targetWeightKg * 1.025);
          } else if (rpe !== null && rpe >= 9.5) {
            nextWeight = Math.round(prescribed.targetWeightKg * 0.95);
          }
          return { ...prescribed, targetWeightKg: nextWeight };
        }),
      };

  const newTemplate = [...currentState.weeklyTemplate];
  newTemplate[currentState.currentDayIndex] = updatedDay;

  const nextDayIndex = (currentState.currentDayIndex + 1) % newTemplate.length;
  const wrappedToNewWeek = nextDayIndex === 0;

  return {
    planLengthWeeks: currentState.planLengthWeeks,
    weekNumber: wrappedToNewWeek ? currentState.weekNumber + 1 : currentState.weekNumber,
    weeklyTemplate: newTemplate,
    currentDayIndex: nextDayIndex,
    isDeloadWeek: deload.shouldDeload,
    ...(deload.reason ? { deloadReason: deload.reason } : {}),
    trailingVolumeLoad,
    lastVolumeLoad,
  };
}

export function initialProgramState(profile: UserProfile): ProgramState {
  return {
    planLengthWeeks: profile.planLengthWeeks,
    weekNumber: 1,
    weeklyTemplate: generateWeeklyProgram(profile),
    currentDayIndex: 0,
    isDeloadWeek: false,
    trailingVolumeLoad: 0,
    lastVolumeLoad: 0,
  };
}
