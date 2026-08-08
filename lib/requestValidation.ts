import { ExerciseDef, Equipment, ExperienceLevel, Injury, MuscleGroup, PlanLengthWeeks, PrescribedExercise, PrescribedSession, PrimaryGoal, UserProfile, WorkoutSession } from "./types";
import { EXERCISES, findExercise } from "./exercises";

const VALID_GOALS: PrimaryGoal[] = ["strength", "hypertrophy", "fat_loss", "endurance", "general_health"];
const VALID_EXPERIENCE: ExperienceLevel[] = ["new", "beginner", "intermediate", "advanced"];
const VALID_EQUIPMENT: Equipment[] = ["full_gym", "dumbbells", "barbell", "bands", "bodyweight_only", "machines"];
const VALID_MUSCLES: MuscleGroup[] = ["chest", "back", "traps", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "core", "forearms"];
const VALID_TIERS = ["free", "premium"] as const;

function toStringField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toIntField(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (Math.floor(value) !== value) return null;
  if (value < min || value > max) return null;
  return value;
}

function toPositiveIntField(value: unknown, max: number): number | null {
  return toIntField(value, 1, max);
}

function toOptionalTextField(value: unknown, maxLength = 320): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function toOptionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const cleaned = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item): item is string => Boolean(item));
  return cleaned.length ? cleaned : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function sanitizeUserProfile(input: unknown, expectedUid?: string): UserProfile | null {
  if (!isRecord(input)) return null;

  const uid = toStringField(input.uid);
  if (!uid || (expectedUid && uid !== expectedUid)) return null;

  const displayName = toStringField(input.displayName);
  if (!displayName) return null;

  const uiMode = input.uiMode === "beginner" || input.uiMode === "advanced" ? input.uiMode : null;
  const goals = Array.isArray(input.goals)
    ? input.goals.filter((g): g is PrimaryGoal => VALID_GOALS.includes(g as PrimaryGoal))
    : [];
  if (goals.length === 0) return null;

  const experienceLevel = VALID_EXPERIENCE.includes(input.experienceLevel as ExperienceLevel)
    ? (input.experienceLevel as ExperienceLevel)
    : null;
  if (!experienceLevel) return null;

  const daysPerWeek = toPositiveIntField(input.daysPerWeek, 6);
  const sessionLengthMin = toPositiveIntField(input.sessionLengthMin, 90);
  if (daysPerWeek == null || sessionLengthMin == null) return null;

  const equipment = Array.isArray(input.equipment)
    ? input.equipment.filter((e): e is Equipment => VALID_EQUIPMENT.includes(e as Equipment))
    : [];
  if (equipment.length === 0) return null;

  const injuries = Array.isArray(input.injuries)
    ? input.injuries
        .filter(isRecord)
        .map((inj) => {
          const bodyPart = toStringField(inj.bodyPart);
          const severity = inj.severity === "mild" || inj.severity === "moderate" || inj.severity === "avoid_loading"
            ? inj.severity
            : null;
          if (!bodyPart || !severity) return null;
          return { bodyPart, severity, note: toStringField(inj.note) ?? undefined } as Injury;
        })
        .filter((inj): inj is Injury => inj != null)
    : [];

  const bodyweightKg = typeof input.bodyweightKg === "number" && Number.isFinite(input.bodyweightKg) && input.bodyweightKg >= 0
    ? input.bodyweightKg
    : undefined;
  const maxPushups = toIntField(input.maxPushups, 0, 1000);
  const maxPullups = toIntField(input.maxPullups, 0, 1000);
  const maxSitups = toIntField(input.maxSitups, 0, 1000);

  const targetMuscleGroups = Array.isArray(input.targetMuscleGroups)
    ? input.targetMuscleGroups.filter((m): m is MuscleGroup => VALID_MUSCLES.includes(m as MuscleGroup))
    : [];

  const specificGoals = toOptionalTextField(input.specificGoals);
  const focusAreas = toOptionalStringArray(input.focusAreas);
  const aiPlanSummary = toOptionalTextField(input.aiPlanSummary);

  const planLengthWeeks = [4, 8, 12, 0].includes(input.planLengthWeeks as PlanLengthWeeks)
    ? (input.planLengthWeeks as PlanLengthWeeks)
    : null;
  if (planLengthWeeks == null) return null;

  const subscriptionTier = VALID_TIERS.includes(input.subscriptionTier as (typeof VALID_TIERS)[number])
    ? (input.subscriptionTier as UserProfile["subscriptionTier"])
    : "free";

  const createdAt = typeof input.createdAt === "number" && Number.isFinite(input.createdAt) && input.createdAt > 0
    ? input.createdAt
    : Date.now();

  return {
    uid,
    displayName,
    uiMode: uiMode ?? "beginner",
    goals,
    experienceLevel,
    daysPerWeek,
    sessionLengthMin,
    equipment,
    injuries,
    bodyweightKg,
    ...(maxPushups != null ? { maxPushups } : {}),
    ...(maxPullups != null ? { maxPullups } : {}),
    ...(maxSitups != null ? { maxSitups } : {}),
    targetMuscleGroups,
    ...(specificGoals ? { specificGoals } : {}),
    ...(focusAreas ? { focusAreas } : {}),
    ...(aiPlanSummary ? { aiPlanSummary } : {}),
    planLengthWeeks,
    subscriptionTier,
    createdAt,
  };
}

function sanitizePrescribedExercise(input: unknown): PrescribedExercise | null {
  if (!isRecord(input)) return null;
  const exerciseId = toStringField(input.exerciseId);
  if (!exerciseId || !findExercise(exerciseId)) return null;

  const sets = toIntField(input.sets, 1, 8);
  const reps = toIntField(input.reps, 1, 50);
  const restSeconds = toIntField(input.restSeconds, 15, 300);
  const targetWeightKg =
    typeof input.targetWeightKg === "number" && Number.isFinite(input.targetWeightKg) && input.targetWeightKg >= 0
      ? input.targetWeightKg
      : null;
  if (sets == null || reps == null || restSeconds == null || targetWeightKg == null) return null;

  return { exerciseId, sets, reps, targetWeightKg, restSeconds };
}

/** Validates a single prescribed training day, e.g. `program.weeklyTemplate[currentDayIndex]`. */
export function sanitizePrescribedSession(input: unknown): PrescribedSession | null {
  if (!isRecord(input)) return null;
  const focus = toStringField(input.focus);
  if (!focus) return null;

  const exercises = Array.isArray(input.exercises)
    ? input.exercises
        .map(sanitizePrescribedExercise)
        .filter((e): e is PrescribedExercise => e != null)
    : [];
  if (exercises.length === 0) return null;

  return { focus, exercises };
}

export function sanitizeWorkoutSession(input: unknown): WorkoutSession | null {
  if (!isRecord(input)) return null;

  const id = toStringField(input.id);
  if (!id) return null;

  const date = typeof input.date === "number" && Number.isFinite(input.date) && input.date > 0 ? input.date : null;
  if (!date) return null;

  const exercises = Array.isArray(input.exercises)
    ? input.exercises
        .filter(isRecord)
        .map((set) => {
          const exerciseId = toStringField(set.exerciseId);
          const setNumber = toIntField(set.setNumber, 1, 50);
          const reps = toIntField(set.reps, 0, 100);
          const seconds = toPositiveIntField(set.seconds, 600);
          const weightKg = typeof set.weightKg === "number" && Number.isFinite(set.weightKg) && set.weightKg >= 0 ? set.weightKg : 0;
          const rpe = set.rpe === 1 || set.rpe === 2 || set.rpe === 3 || set.rpe === 4 || set.rpe === 5 || set.rpe === 6 || set.rpe === 7 || set.rpe === 8 || set.rpe === 9 || set.rpe === 10 ? set.rpe : undefined;
          if (!exerciseId || setNumber == null || (reps == null && seconds == null)) return null;
          const exercise = findExercise(exerciseId);
          if (!exercise) return null;
          return {
            exerciseId,
            setNumber,
            reps: reps ?? 0,
            weightKg,
            ...(seconds != null ? { seconds } : {}),
            ...(rpe != null ? { rpe } : {}),
          };
        })
        .filter((set): set is NonNullable<typeof set> => set != null)
    : [];

  if (exercises.length === 0) return null;

  const loggedVia = input.loggedVia === "manual" || input.loggedVia === "voice" ? input.loggedVia : "manual";
  const effortRating = input.effortRating === "easy" || input.effortRating === "medium" || input.effortRating === "hard"
    ? input.effortRating
    : undefined;
  const recoveryScore = input.recoveryScore === 1 || input.recoveryScore === 2 || input.recoveryScore === 3 || input.recoveryScore === 4 || input.recoveryScore === 5
    ? input.recoveryScore
    : undefined;

  const feedback = isRecord(input.feedback)
    ? {
        wentWell: toStringField(input.feedback.wentWell) ?? undefined,
        toImprove: toStringField(input.feedback.toImprove) ?? undefined,
      }
    : undefined;

  return {
    id,
    date,
    exercises,
    ...(effortRating ? { effortRating } : {}),
    ...(recoveryScore ? { recoveryScore } : {}),
    loggedVia,
    ...(input.durationMin != null ? { durationMin: toPositiveIntField(input.durationMin, 600) ?? undefined } : {}),
    ...(feedback ? { feedback } : {}),
  };
}
