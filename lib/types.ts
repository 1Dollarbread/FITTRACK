// ---------------------------------------------------------------------------
// Firestore collections:
//   users/{uid}                        -> UserProfile
//   users/{uid}/sessions/{sessionId}    -> WorkoutSession
//   users/{uid}/microGoals/{goalId}     -> MicroGoal
//   users/{uid}/programState/current    -> ProgramState (single doc, engine output)
// ---------------------------------------------------------------------------

export type ExperienceLevel = "new" | "beginner" | "intermediate" | "advanced";
export type PrimaryGoal =
  | "strength"
  | "hypertrophy"
  | "fat_loss"
  | "endurance"
  | "general_health";
export type Equipment =
  | "full_gym"
  | "dumbbells"
  | "barbell"
  | "bands"
  | "bodyweight_only"
  | "machines";
export type UIMode = "beginner" | "advanced";

/** Granular muscle taxonomy — drives both the anatomy selector and accessory exercise targeting. */
export type MuscleGroup =
  | "chest"
  | "back"
  | "traps"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core"
  | "forearms";

export type PlanLengthWeeks = 4 | 8 | 12 | 0; // 0 = ongoing / no fixed end date

export interface Injury {
  bodyPart: string; // e.g. "left shoulder", "lower back"
  note?: string;
  severity: "mild" | "moderate" | "avoid_loading";
}

/** Captured once at onboarding, editable later. Drives every program decision. */
export interface UserProfile {
  uid: string;
  displayName: string;
  uiMode: UIMode;
  goals: PrimaryGoal[];
  experienceLevel: ExperienceLevel;
  daysPerWeek: number; // training availability
  sessionLengthMin: number;
  equipment: Equipment[];
  injuries: Injury[];
  bodyweightKg?: number;
  /** One-rep-max style bodyweight baselines collected at signup — used to scale BW work. */
  maxPushups?: number;
  maxPullups?: number;
  maxSitups?: number;
  targetMuscleGroups: MuscleGroup[]; // selected on the anatomy map during onboarding
  planLengthWeeks: PlanLengthWeeks;
  subscriptionTier: "free" | "premium"; // Stripe checkout not yet wired — defaults to "free"
  /** Consecutive-day training streak. Increments when a session is logged on a
   *  new local-calendar day, resets to 0 if a day is missed, and is set to 1
   *  on the very first session. */
  streak?: number;
  /** ISO `YYYY-MM-DD` (in the user's local timezone at the time of the
   *  session) of the most recent day that extended the streak. Used to decide
   *  whether the next session increments or resets. */
  lastStreakDay?: string;
  /** XP points earned from workouts and weekly completion rewards. */
  xp?: number;
  /** Current progression level derived from total XP. */
  level?: number;
  /** Week key for the weekly bonus reward so it only triggers once per week. */
  lastWeeklyBonusWeek?: string;
  createdAt: number;
}

export interface ExerciseDef {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  pattern: "squat" | "hinge" | "push" | "pull" | "carry" | "core" | "cardio" | "isolation";
  /** True for single-muscle accessory movements used to fill target-muscle emphasis slots. */
  isAccessory: boolean;
  requiredEquipment: Equipment[];
  /** Other exercise ids this can be swapped for/from — the Equipment Swap Engine reads this. */
  swapGroup: string;
  difficulty: ExperienceLevel;
}

export type ExerciseMediaType = "image" | "video" | "youtube";

export interface ExerciseMedia {
  type: ExerciseMediaType;
  src: string;
  alt: string;
  poster?: string;
  caption?: string;
}

export interface ExerciseFormInfo {
  media: ExerciseMedia;
  instructions: string;
  details: string[];
}

export interface SetLog {
  exerciseId: string;
  setNumber: number;
  reps: number;
  seconds?: number;
  weightKg: number;
  rpe?: number; // 1-10 reported effort, core signal for the overload engine
}

export interface WorkoutFeedback {
  wentWell?: string;
  toImprove?: string;
}

export interface WorkoutSession {
  id: string;
  date: number;
  exercises: SetLog[];
  effortRating?: "easy" | "medium" | "hard"; // Beginner-mode alternative to RPE
  recoveryScore?: 1 | 2 | 3 | 4 | 5; // self-reported sleep/soreness/stress composite
  loggedVia: "manual" | "voice";
  durationMin?: number;
  /** Free-text post-session notes sent to Groq to reshape the next block. */
  feedback?: WorkoutFeedback;
}

/** Output of the Dynamic Progressive Overload Engine — recomputed after every session. */
export interface ProgramState {
  planLengthWeeks: PlanLengthWeeks;
  weekNumber: number;
  /** One PrescribedSession per training day this week, in order. */
  weeklyTemplate: PrescribedSession[];
  /** Index into weeklyTemplate for the next session to be trained. */
  currentDayIndex: number;
  isDeloadWeek: boolean;
  deloadReason?: string;
  trailingVolumeLoad: number; // rolling average, basis for the Load Meter
  lastVolumeLoad: number;
}

export interface PrescribedExercise {
  exerciseId: string;
  sets: number;
  reps: number;
  targetWeightKg: number;
  restSeconds: number;
}

export interface PrescribedSession {
  exercises: PrescribedExercise[];
  focus: string; // e.g. "Lower body — strength"
}

/** Adaptive Habit Micro-Goals — small, learned nudges rather than the full program. */
export interface MicroGoal {
  id: string;
  text: string;
  triggerContext: string; // e.g. "post-dinner", "study break"
  targetMinutesOrReps: number;
  streak: number;
  scaledFrom?: string; // id of the micro-goal this evolved from, for progression history
  active: boolean;
}
