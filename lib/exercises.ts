import { ExerciseDef, Equipment, ExperienceLevel, MuscleGroup } from "./types";

// swapGroup is the key idea here: any two exercises sharing a swapGroup train the
// same movement pattern + primary muscle closely enough to substitute mid-program
// without invalidating the overload math. The engine filters this list by
// swapGroup + available equipment, then picks the closest difficulty match.
//
// Every compound pattern below has at least one bodyweight_only entry, so a
// pattern can never come up completely empty just because a user didn't
// happen to pick every equipment checkbox — bodyweight is always the floor.
export const EXERCISES: ExerciseDef[] = [
  // ---- Squat pattern (quads) ----
  { id: "back_squat", name: "Back Squat", muscleGroup: "quads", secondaryMuscles: ["glutes"], pattern: "squat", isAccessory: false, requiredEquipment: ["barbell", "full_gym"], swapGroup: "squat_bilateral", difficulty: "intermediate" },
  { id: "goblet_squat", name: "Goblet Squat", muscleGroup: "quads", secondaryMuscles: ["glutes"], pattern: "squat", isAccessory: false, requiredEquipment: ["dumbbells"], swapGroup: "squat_bilateral", difficulty: "beginner" },
  { id: "bodyweight_squat", name: "Bodyweight Squat", muscleGroup: "quads", secondaryMuscles: ["glutes"], pattern: "squat", isAccessory: false, requiredEquipment: ["bodyweight_only"], swapGroup: "squat_bilateral", difficulty: "new" },
  { id: "leg_press", name: "Leg Press", muscleGroup: "quads", secondaryMuscles: ["glutes"], pattern: "squat", isAccessory: false, requiredEquipment: ["machines", "full_gym"], swapGroup: "squat_bilateral", difficulty: "beginner" },
  { id: "band_squat", name: "Band Resisted Squat", muscleGroup: "quads", secondaryMuscles: ["glutes"], pattern: "squat", isAccessory: false, requiredEquipment: ["bands"], swapGroup: "squat_bilateral", difficulty: "new" },

  // ---- Hinge pattern (hamstrings / glutes) ----
  { id: "deadlift", name: "Barbell Deadlift", muscleGroup: "hamstrings", secondaryMuscles: ["glutes", "back"], pattern: "hinge", isAccessory: false, requiredEquipment: ["barbell", "full_gym"], swapGroup: "hinge_bilateral", difficulty: "intermediate" },
  { id: "dumbbell_rdl", name: "Dumbbell RDL", muscleGroup: "hamstrings", secondaryMuscles: ["glutes"], pattern: "hinge", isAccessory: false, requiredEquipment: ["dumbbells"], swapGroup: "hinge_bilateral", difficulty: "beginner" },
  { id: "band_good_morning", name: "Band Good Morning", muscleGroup: "hamstrings", secondaryMuscles: ["glutes"], pattern: "hinge", isAccessory: false, requiredEquipment: ["bands"], swapGroup: "hinge_bilateral", difficulty: "new" },
  { id: "bodyweight_good_morning", name: "Bodyweight Good Morning", muscleGroup: "hamstrings", secondaryMuscles: ["glutes"], pattern: "hinge", isAccessory: false, requiredEquipment: ["bodyweight_only"], swapGroup: "hinge_bilateral", difficulty: "new" },

  // ---- Push, horizontal (chest) ----
  { id: "bench_press", name: "Barbell Bench Press", muscleGroup: "chest", secondaryMuscles: ["triceps"], pattern: "push", isAccessory: false, requiredEquipment: ["barbell", "full_gym"], swapGroup: "push_horizontal", difficulty: "intermediate" },
  { id: "dumbbell_press", name: "Dumbbell Bench Press", muscleGroup: "chest", secondaryMuscles: ["triceps"], pattern: "push", isAccessory: false, requiredEquipment: ["dumbbells"], swapGroup: "push_horizontal", difficulty: "beginner" },
  { id: "pushup", name: "Push-Up", muscleGroup: "chest", secondaryMuscles: ["triceps"], pattern: "push", isAccessory: false, requiredEquipment: ["bodyweight_only"], swapGroup: "push_horizontal", difficulty: "new" },
  { id: "band_press", name: "Band Chest Press", muscleGroup: "chest", secondaryMuscles: ["triceps"], pattern: "push", isAccessory: false, requiredEquipment: ["bands"], swapGroup: "push_horizontal", difficulty: "new" },

  // ---- Push, vertical (shoulders) ----
  { id: "overhead_press", name: "Overhead Press", muscleGroup: "shoulders", secondaryMuscles: ["triceps"], pattern: "push", isAccessory: false, requiredEquipment: ["barbell", "full_gym", "dumbbells"], swapGroup: "push_vertical", difficulty: "intermediate" },
  { id: "pike_pushup", name: "Pike Push-Up", muscleGroup: "shoulders", secondaryMuscles: ["triceps"], pattern: "push", isAccessory: false, requiredEquipment: ["bodyweight_only"], swapGroup: "push_vertical", difficulty: "beginner" },
  { id: "band_overhead_press", name: "Band Overhead Press", muscleGroup: "shoulders", secondaryMuscles: ["triceps"], pattern: "push", isAccessory: false, requiredEquipment: ["bands"], swapGroup: "push_vertical", difficulty: "new" },

  // ---- Pull, vertical (back / lats) ----
  { id: "pullup", name: "Pull-Up", muscleGroup: "back", secondaryMuscles: ["biceps"], pattern: "pull", isAccessory: false, requiredEquipment: ["bodyweight_only", "full_gym"], swapGroup: "pull_vertical", difficulty: "intermediate" },
  { id: "lat_pulldown", name: "Lat Pulldown", muscleGroup: "back", secondaryMuscles: ["biceps"], pattern: "pull", isAccessory: false, requiredEquipment: ["machines", "full_gym"], swapGroup: "pull_vertical", difficulty: "beginner" },
  { id: "band_pulldown", name: "Band Pulldown", muscleGroup: "back", secondaryMuscles: ["biceps"], pattern: "pull", isAccessory: false, requiredEquipment: ["bands"], swapGroup: "pull_vertical", difficulty: "new" },

  // ---- Pull, horizontal (back) ----
  { id: "barbell_row", name: "Barbell Row", muscleGroup: "back", secondaryMuscles: ["biceps"], pattern: "pull", isAccessory: false, requiredEquipment: ["barbell", "full_gym"], swapGroup: "pull_horizontal", difficulty: "intermediate" },
  { id: "dumbbell_row", name: "Dumbbell Row", muscleGroup: "back", secondaryMuscles: ["biceps"], pattern: "pull", isAccessory: false, requiredEquipment: ["dumbbells"], swapGroup: "pull_horizontal", difficulty: "beginner" },
  { id: "band_row", name: "Band Row", muscleGroup: "back", secondaryMuscles: ["biceps"], pattern: "pull", isAccessory: false, requiredEquipment: ["bands"], swapGroup: "pull_horizontal", difficulty: "new" },
  { id: "bodyweight_row", name: "Table/Bar Inverted Row", muscleGroup: "back", secondaryMuscles: ["biceps"], pattern: "pull", isAccessory: false, requiredEquipment: ["bodyweight_only"], swapGroup: "pull_horizontal", difficulty: "beginner" },

  // ---- Back accessories (lats) — needed so selecting "Back" on the map actually adds volume ----
  { id: "straight_arm_pulldown", name: "Straight-Arm Pulldown", muscleGroup: "back", pattern: "isolation", isAccessory: true, requiredEquipment: ["machines", "full_gym"], swapGroup: "lat_isolation", difficulty: "beginner" },
  { id: "dumbbell_pullover", name: "Dumbbell Pullover", muscleGroup: "back", secondaryMuscles: ["chest"], pattern: "isolation", isAccessory: true, requiredEquipment: ["dumbbells"], swapGroup: "lat_isolation", difficulty: "beginner" },
  { id: "band_pullover", name: "Band Pullover", muscleGroup: "back", pattern: "isolation", isAccessory: true, requiredEquipment: ["bands"], swapGroup: "lat_isolation", difficulty: "new" },

  // ---- Traps (isolation) ----
  { id: "dumbbell_shrug", name: "Dumbbell Shrug", muscleGroup: "traps", pattern: "isolation", isAccessory: true, requiredEquipment: ["dumbbells"], swapGroup: "trap_shrug", difficulty: "new" },
  { id: "barbell_shrug", name: "Barbell Shrug", muscleGroup: "traps", pattern: "isolation", isAccessory: true, requiredEquipment: ["barbell", "full_gym"], swapGroup: "trap_shrug", difficulty: "beginner" },
  { id: "band_shrug", name: "Band Shrug", muscleGroup: "traps", pattern: "isolation", isAccessory: true, requiredEquipment: ["bands"], swapGroup: "trap_shrug", difficulty: "new" },
  { id: "face_pull", name: "Cable/Band Face Pull", muscleGroup: "traps", secondaryMuscles: ["shoulders"], pattern: "isolation", isAccessory: true, requiredEquipment: ["bands", "machines", "full_gym"], swapGroup: "trap_retract", difficulty: "beginner" },
  { id: "prone_y_raise", name: "Prone Y Raise", muscleGroup: "traps", secondaryMuscles: ["shoulders"], pattern: "isolation", isAccessory: true, requiredEquipment: ["bodyweight_only", "dumbbells"], swapGroup: "trap_retract", difficulty: "new" },

  // ---- Core ----
  { id: "hanging_leg_raise", name: "Hanging Leg Raise", muscleGroup: "core", pattern: "core", isAccessory: true, requiredEquipment: ["full_gym", "bodyweight_only"], swapGroup: "core_flexion", difficulty: "intermediate" },
  { id: "plank", name: "Plank", muscleGroup: "core", pattern: "core", isAccessory: true, requiredEquipment: ["bodyweight_only"], swapGroup: "core_flexion", difficulty: "new" },
  { id: "bicycle_crunch", name: "Bicycle Crunch", muscleGroup: "core", pattern: "core", isAccessory: true, requiredEquipment: ["bodyweight_only"], swapGroup: "core_rotation", difficulty: "new" },
  { id: "situp", name: "Sit-Up", muscleGroup: "core", pattern: "core", isAccessory: true, requiredEquipment: ["bodyweight_only"], swapGroup: "core_flexion", difficulty: "new" },
  { id: "pallof_press", name: "Band Pallof Press", muscleGroup: "core", pattern: "core", isAccessory: true, requiredEquipment: ["bands"], swapGroup: "core_rotation", difficulty: "beginner" },

  // ---- Carry / cardio ----
  { id: "farmers_carry", name: "Farmer's Carry", muscleGroup: "forearms", secondaryMuscles: ["core"], pattern: "carry", isAccessory: true, requiredEquipment: ["dumbbells", "full_gym"], swapGroup: "loaded_carry", difficulty: "beginner" },
  { id: "brisk_walk", name: "Brisk Walk", muscleGroup: "calves", pattern: "cardio", isAccessory: false, requiredEquipment: ["bodyweight_only"], swapGroup: "steady_cardio", difficulty: "new" },
  { id: "cardio_choice_20min", name: "20-Minute Cardio (Your Choice)", muscleGroup: "calves", pattern: "cardio", isAccessory: false, requiredEquipment: ["bodyweight_only"], swapGroup: "steady_cardio", difficulty: "new" },
  { id: "sprint_60m", name: "60m Sprint", muscleGroup: "calves", pattern: "cardio", isAccessory: false, requiredEquipment: ["bodyweight_only"], swapGroup: "sprint_intervals", difficulty: "beginner" },
  { id: "sprint_100m", name: "100m Sprint", muscleGroup: "calves", pattern: "cardio", isAccessory: false, requiredEquipment: ["bodyweight_only"], swapGroup: "sprint_intervals", difficulty: "intermediate" },
  { id: "mile_run_1", name: "1 Mile Run", muscleGroup: "calves", pattern: "cardio", isAccessory: false, requiredEquipment: ["bodyweight_only"], swapGroup: "distance_run", difficulty: "beginner" },
  { id: "mile_run_2", name: "2 Mile Run", muscleGroup: "calves", pattern: "cardio", isAccessory: false, requiredEquipment: ["bodyweight_only"], swapGroup: "distance_run", difficulty: "advanced", requiresExperience: "advanced" },
  { id: "mile_run_3", name: "3 Mile Run", muscleGroup: "calves", pattern: "cardio", isAccessory: false, requiredEquipment: ["bodyweight_only"], swapGroup: "distance_run", difficulty: "advanced", requiresExperience: "advanced" },
  { id: "mile_run_4", name: "4 Mile Run", muscleGroup: "calves", pattern: "cardio", isAccessory: false, requiredEquipment: ["bodyweight_only"], swapGroup: "distance_run", difficulty: "advanced", requiresExperience: "advanced" },
  { id: "mile_run_5", name: "5 Mile Run", muscleGroup: "calves", pattern: "cardio", isAccessory: false, requiredEquipment: ["bodyweight_only"], swapGroup: "distance_run", difficulty: "advanced", requiresExperience: "advanced" },

  // ---- Biceps (isolation) ----
  { id: "dumbbell_curl", name: "Dumbbell Curl", muscleGroup: "biceps", pattern: "isolation", isAccessory: true, requiredEquipment: ["dumbbells"], swapGroup: "biceps_curl", difficulty: "new" },
  { id: "band_curl", name: "Band Curl", muscleGroup: "biceps", pattern: "isolation", isAccessory: true, requiredEquipment: ["bands"], swapGroup: "biceps_curl", difficulty: "new" },
  { id: "chinup", name: "Chin-Up (close grip)", muscleGroup: "biceps", secondaryMuscles: ["back"], pattern: "isolation", isAccessory: true, requiredEquipment: ["bodyweight_only", "full_gym"], swapGroup: "biceps_curl", difficulty: "intermediate" },

  // ---- Triceps (isolation) ----
  { id: "triceps_pushdown", name: "Triceps Pushdown", muscleGroup: "triceps", pattern: "isolation", isAccessory: true, requiredEquipment: ["machines", "full_gym"], swapGroup: "triceps_extension", difficulty: "beginner" },
  { id: "overhead_extension", name: "Overhead Dumbbell Extension", muscleGroup: "triceps", pattern: "isolation", isAccessory: true, requiredEquipment: ["dumbbells"], swapGroup: "triceps_extension", difficulty: "beginner" },
  { id: "band_pushdown", name: "Band Triceps Pushdown", muscleGroup: "triceps", pattern: "isolation", isAccessory: true, requiredEquipment: ["bands"], swapGroup: "triceps_extension", difficulty: "new" },
  { id: "diamond_pushup", name: "Diamond Push-Up", muscleGroup: "triceps", secondaryMuscles: ["chest"], pattern: "isolation", isAccessory: true, requiredEquipment: ["bodyweight_only"], swapGroup: "triceps_extension", difficulty: "beginner" },

  // ---- Shoulders (isolation) ----
  { id: "lateral_raise", name: "Dumbbell Lateral Raise", muscleGroup: "shoulders", pattern: "isolation", isAccessory: true, requiredEquipment: ["dumbbells"], swapGroup: "shoulder_lateral", difficulty: "new" },
  { id: "band_lateral_raise", name: "Band Lateral Raise", muscleGroup: "shoulders", pattern: "isolation", isAccessory: true, requiredEquipment: ["bands"], swapGroup: "shoulder_lateral", difficulty: "new" },

  // ---- Glutes (isolation) ----
  { id: "hip_thrust", name: "Barbell Hip Thrust", muscleGroup: "glutes", pattern: "isolation", isAccessory: true, requiredEquipment: ["barbell", "full_gym"], swapGroup: "glute_bridge", difficulty: "beginner" },
  { id: "dumbbell_hip_thrust", name: "Dumbbell Hip Thrust", muscleGroup: "glutes", pattern: "isolation", isAccessory: true, requiredEquipment: ["dumbbells"], swapGroup: "glute_bridge", difficulty: "new" },
  { id: "glute_bridge", name: "Glute Bridge", muscleGroup: "glutes", pattern: "isolation", isAccessory: true, requiredEquipment: ["bodyweight_only"], swapGroup: "glute_bridge", difficulty: "new" },
  { id: "band_hip_thrust", name: "Band Hip Thrust", muscleGroup: "glutes", pattern: "isolation", isAccessory: true, requiredEquipment: ["bands"], swapGroup: "glute_bridge", difficulty: "new" },

  // ---- Hamstrings (isolation, in addition to the hinge pattern above) ----
  { id: "leg_curl", name: "Leg Curl Machine", muscleGroup: "hamstrings", pattern: "isolation", isAccessory: true, requiredEquipment: ["machines", "full_gym"], swapGroup: "hamstring_curl", difficulty: "beginner" },
  { id: "band_leg_curl", name: "Band Leg Curl", muscleGroup: "hamstrings", pattern: "isolation", isAccessory: true, requiredEquipment: ["bands"], swapGroup: "hamstring_curl", difficulty: "new" },
  { id: "nordic_curl_negative", name: "Nordic Curl Negative", muscleGroup: "hamstrings", pattern: "isolation", isAccessory: true, requiredEquipment: ["bodyweight_only"], swapGroup: "hamstring_curl", difficulty: "advanced" },

  // ---- Calves (isolation) ----
  { id: "standing_calf_raise", name: "Standing Calf Raise", muscleGroup: "calves", pattern: "isolation", isAccessory: true, requiredEquipment: ["bodyweight_only", "dumbbells", "machines", "full_gym"], swapGroup: "calf_raise", difficulty: "new" },
  { id: "band_calf_raise", name: "Band Calf Raise", muscleGroup: "calves", pattern: "isolation", isAccessory: true, requiredEquipment: ["bands"], swapGroup: "calf_raise", difficulty: "new" },

  // ---- Forearms (isolation) ----
  { id: "wrist_curl", name: "Dumbbell Wrist Curl", muscleGroup: "forearms", pattern: "isolation", isAccessory: true, requiredEquipment: ["dumbbells"], swapGroup: "forearm_curl", difficulty: "new" },
  { id: "dead_hang", name: "Dead Hang", muscleGroup: "forearms", pattern: "isolation", isAccessory: true, requiredEquipment: ["bodyweight_only", "full_gym"], swapGroup: "forearm_curl", difficulty: "new" },
];

export function findExercise(id: string): ExerciseDef | undefined {
  return EXERCISES.find((e) => e.id === id);
}

/** Every user can always perform bodyweight movements, regardless of what they checked. */
export function withImplicitBodyweight(equipment: Equipment[]): Equipment[] {
  return equipment.includes("bodyweight_only") ? equipment : [...equipment, "bodyweight_only"];
}

/** Shared new < beginner < intermediate < advanced ordering for difficulty/experience comparisons. */
export function experienceRank(level: ExperienceLevel): number {
  return { new: 0, beginner: 1, intermediate: 2, advanced: 3 }[level];
}

function meetsExperienceRequirement(exercise: ExerciseDef, experienceLevel?: ExperienceLevel): boolean {
  if (!exercise.requiresExperience) return true;
  if (!experienceLevel) return false;
  return experienceRank(experienceLevel) >= experienceRank(exercise.requiresExperience);
}

/**
 * Equipment Swap Engine.
 * Given an exercise the user can't currently perform (or taps "Swap" on),
 * return the best available substitute: same swapGroup, equipment the user
 * actually has, closest difficulty to the original so the prescribed load
 * logic doesn't have to be recalculated from scratch. Candidates gated by
 * `requiresExperience` (e.g. multi-mile runs) are excluded unless the
 * athlete's experience level clears that bar.
 */
export function swapExercise(
  currentExerciseId: string,
  availableEquipment: Equipment[],
  experienceLevel?: ExperienceLevel
): ExerciseDef | null {
  const current = findExercise(currentExerciseId);
  if (!current) return null;
  const equipment = withImplicitBodyweight(availableEquipment);

  const candidates = EXERCISES.filter(
    (e) =>
      e.swapGroup === current.swapGroup &&
      e.id !== current.id &&
      e.requiredEquipment.some((eq) => equipment.includes(eq)) &&
      meetsExperienceRequirement(e, experienceLevel)
  );

  if (candidates.length === 0) return null;

  const currentRank = experienceRank(current.difficulty);

  candidates.sort(
    (a, b) =>
      Math.abs(experienceRank(a.difficulty) - currentRank) -
      Math.abs(experienceRank(b.difficulty) - currentRank)
  );

  return candidates[0];
}

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back (lats)",
  traps: "Traps",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core",
  forearms: "Forearms",
};

/** Compact catalog for Groq prompts — keeps the model on known exercise ids. */
export function exerciseCatalogForPrompt(): string {
  return EXERCISES.map(
    (e) =>
      `${e.id}|${e.name}|${e.muscleGroup}|${e.pattern}|accessory=${e.isAccessory}|eq=${e.requiredEquipment.join(",")}`
  ).join("\n");
}
