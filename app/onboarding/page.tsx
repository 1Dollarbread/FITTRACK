"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  PrimaryGoal,
  Equipment,
  ExperienceLevel,
  UserProfile,
  Injury,
  MuscleGroup,
  PlanLengthWeeks,
  ProgramState,
} from "@/lib/types";
import { initialProgramState } from "@/lib/programGenerator";
import { postJson } from "@/lib/apiClient";
import MuscleMapSelector from "@/components/MuscleMapSelector";

const GOALS: { id: PrimaryGoal; label: string }[] = [
  { id: "strength", label: "Get stronger" },
  { id: "hypertrophy", label: "Build muscle" },
  { id: "fat_loss", label: "Lose fat" },
  { id: "endurance", label: "Build endurance" },
  { id: "general_health", label: "General health" },
];

const EQUIPMENT_OPTIONS: { id: Equipment; label: string }[] = [
  { id: "full_gym", label: "Commercial gym" },
  { id: "dumbbells", label: "Adjustable dumbbells" },
  { id: "barbell", label: "Barbell" },
  { id: "bands", label: "Resistance bands" },
  { id: "machines", label: "Cable / machines" },
  { id: "bodyweight_only", label: "Bodyweight only" },
];

const EXPERIENCE_OPTIONS: { id: ExperienceLevel; label: string }[] = [
  { id: "new", label: "Beginner" },
  { id: "beginner", label: "Some experience" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

const PLAN_LENGTH_OPTIONS: { id: PlanLengthWeeks; label: string }[] = [
  { id: 4, label: "4 weeks" },
  { id: 8, label: "8 weeks" },
  { id: 12, label: "12 weeks" },
  { id: 0, label: "Ongoing" },
];

const TOTAL_STEPS = 8;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [goals, setGoals] = useState<PrimaryGoal[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("beginner");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [sessionLengthMin, setSessionLengthMin] = useState(45);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [injuryDraft, setInjuryDraft] = useState("");
  const [uiMode, setUiMode] = useState<"beginner" | "advanced">("beginner");
  const [targetMuscleGroups, setTargetMuscleGroups] = useState<MuscleGroup[]>([]);
  const [planLengthWeeks, setPlanLengthWeeks] = useState<PlanLengthWeeks>(8);
  const [maxPushups, setMaxPushups] = useState("");
  const [maxPullups, setMaxPullups] = useState("");
  const [maxSitups, setMaxSitups] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Prefer not to say");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [bodyFatKnown, setBodyFatKnown] = useState<"yes" | "no">("no");
  const [bodyFatPct, setBodyFatPct] = useState("");
  const [deadlineEnabled, setDeadlineEnabled] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState("");
  const [successText, setSuccessText] = useState("");
  const [trainingHistory, setTrainingHistory] = useState("Never");
  const [activities, setActivities] = useState<string[]>([]);
  const [benchPress, setBenchPress] = useState("");
  const [squat, setSquat] = useState("");
  const [deadlift, setDeadlift] = useState("");
  const [mileTime, setMileTime] = useState("");
  const [hundredMTime, setHundredMTime] = useState("");
  const [nutrition, setNutrition] = useState("Maintenance");
  const [caloriesTracked, setCaloriesTracked] = useState("Sometimes");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [dislikedFoods, setDislikedFoods] = useState("");
  const [cookingExperience, setCookingExperience] = useState("Basic");
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState(6);
  const [stressLevel, setStressLevel] = useState(5);
  const [dailyActivity, setDailyActivity] = useState("Some walking");
  const [injuryQuestion, setInjuryQuestion] = useState<"yes" | "no">("no");
  const [injuryNotes, setInjuryNotes] = useState("");
  const [painExercises, setPainExercises] = useState("");
  const [enjoyedWorkouts, setEnjoyedWorkouts] = useState<string[]>([]);
  const [dislikedExercises, setDislikedExercises] = useState("");
  const [workoutStyle, setWorkoutStyle] = useState("Balanced");
  const [accountability, setAccountability] = useState<string[]>([]);
  const [preferredTime, setPreferredTime] = useState("No preference");
  const [trainingDays, setTrainingDays] = useState<string[]>([]);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);

  function toggle<T>(list: T[], value: T, setter: (v: T[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function toggleTrainingDay(day: string) {
    setTrainingDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : prev.length >= daysPerWeek
        ? prev
        : [...prev, day]
    );
  }

  useEffect(() => {
    setTrainingDays((prev) => prev.slice(0, daysPerWeek));
  }, [daysPerWeek]);

  function toggleEquipment(option: Equipment) {
    setEquipment((prev) => {
      if (option === "bodyweight_only") {
        return prev.includes("bodyweight_only") ? [] : ["bodyweight_only"];
      }
      const withoutBodyweight = prev.filter((item) => item !== "bodyweight_only");
      if (withoutBodyweight.includes(option)) {
        return withoutBodyweight.filter((item) => item !== option);
      }
      return [...withoutBodyweight, option];
    });
  }

  function toggleMuscle(muscle: MuscleGroup) {
    setTargetMuscleGroups((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );
  }

  function parsePositiveInt(raw: string): number | undefined {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const n = parseInt(trimmed, 10);
    if (!Number.isFinite(n) || n < 0) return undefined;
    return n;
  }

  function removeUndefinedFields<T extends Record<string, unknown>>(input: T): T {
    return Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined)
    ) as T;
  }

  async function finishOnboarding() {
    const user = auth.currentUser;
    if (!user) {
      router.push("/login");
      return;
    }
    setSaving(true);
    setError(null);

    const profile: UserProfile = {
      uid: user.uid,
      displayName: user.displayName ?? "Athlete",
      uiMode,
      goals: goals.length ? goals : ["general_health"],
      experienceLevel,
      daysPerWeek,
      sessionLengthMin,
      equipment: equipment.length ? equipment : ["bodyweight_only"],
      injuries,
      maxPushups: parsePositiveInt(maxPushups),
      maxPullups: parsePositiveInt(maxPullups),
      maxSitups: parsePositiveInt(maxSitups),
      bodyweightKg: parsePositiveInt(weightKg),
      targetMuscleGroups,
      specificGoals: [
        age ? `Age ${age}` : "",
        gender ? `Gender ${gender}` : "",
        heightCm ? `Height ${heightCm} cm` : "",
        weightKg ? `Weight ${weightKg} kg` : "",
        bodyFatKnown === "yes" && bodyFatPct ? `Body fat ${bodyFatPct}%` : "",
        successText ? `Success: ${successText}` : "",
        trainingHistory ? `Training history: ${trainingHistory}` : "",
        activities.length ? `Activities: ${activities.join(", ")}` : "",
        benchPress ? `Bench press ${benchPress}` : "",
        squat ? `Squat ${squat}` : "",
        deadlift ? `Deadlift ${deadlift}` : "",
        mileTime ? `Mile time ${mileTime}` : "",
        hundredMTime ? `100m time ${hundredMTime}` : "",
        nutrition ? `Nutrition ${nutrition}` : "",
        caloriesTracked ? `Calories tracked: ${caloriesTracked}` : "",
        allergies.length ? `Allergies: ${allergies.join(", ")}` : "",
        dislikedFoods ? `Dislikes: ${dislikedFoods}` : "",
        cookingExperience ? `Cooking: ${cookingExperience}` : "",
        `Sleep ${sleepHours}h quality ${sleepQuality}/10`,
        `Stress ${stressLevel}/10`,
        `Daily activity: ${dailyActivity}`,
        injuryQuestion === "yes" ? `Injuries: ${injuryNotes || "listed"}` : "",
        painExercises ? `Painful exercises: ${painExercises}` : "",
        enjoyedWorkouts.length ? `Enjoys: ${enjoyedWorkouts.join(", ")}` : "",
        dislikedExercises ? `Dislikes exercises: ${dislikedExercises}` : "",
        focusAreas.length ? `Focus areas: ${focusAreas.join(", ")}` : "",
        `Workout style: ${workoutStyle}`,
        accountability.length ? `Accountability: ${accountability.join(", ")}` : "",
        preferredTime ? `Preferred time: ${preferredTime}` : "",
        trainingDays.length ? `Training days: ${trainingDays.join(", ")}` : "",
      ].filter(Boolean).join(" | "),
      planLengthWeeks,
      subscriptionTier: "free",
      xp: 0,
      level: 1,
      createdAt: Date.now(),
    };

    try {
      let program: ProgramState = initialProgramState(profile);
      let aiPlanSummary: string | undefined;

      try {
        const data = await postJson<{ program?: ProgramState; coachBriefing?: string; planSummary?: string }>('/api/generate-program', { profile });
        if (data.program?.weeklyTemplate?.length) {
          program = data.program;
        }
        if (typeof data.planSummary === "string" && data.planSummary.trim()) {
          aiPlanSummary = data.planSummary.trim();
        } else if (typeof data.coachBriefing === "string" && data.coachBriefing.trim()) {
          aiPlanSummary = data.coachBriefing.trim();
        }
      } catch (groqErr) {
        console.error("Groq generate failed, using local program:", groqErr);
      }

      const profileToSave: UserProfile = removeUndefinedFields({
        ...profile,
        ...(aiPlanSummary ? { aiPlanSummary } : {}),
      });

      await setDoc(doc(db, "users", user.uid), profileToSave);
      await setDoc(doc(db, "users", user.uid, "programState", "current"), program);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not save your program. Check your connection and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-16">
      <div className="w-full max-w-lg">
        <div className="flex gap-1 mb-10">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i < step ? "bg-signal" : "bg-border"}`} />
          ))}
        </div>

        {step === 1 && (
          <StepShell title="Quick intro" subtitle="A few answers will shape your whole plan.">
            <div className="flex flex-col gap-4">
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Age</span>
                <input type="number" min={13} max={100} value={age} onChange={(e) => setAge(e.target.value)} className="w-full input-field" />
              </label>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Gender</span>
                <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full input-field">
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                  <option>Prefer not to say</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Height (cm)</span>
                <input type="number" min={100} max={250} value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className="w-full input-field" />
              </label>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Weight (kg)</span>
                <input type="number" min={30} max={250} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="w-full input-field" />
              </label>
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title="Your goal" subtitle="Pick the main outcome and what success looks like.">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                {GOALS.map((g) => (
                  <OptionCard key={g.id} label={g.label} selected={goals.includes(g.id)} onClick={() => toggle(goals, g.id, setGoals)} />
                ))}
              </div>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">What would success look like?</span>
                <textarea value={successText} onChange={(e) => setSuccessText(e.target.value)} rows={3} placeholder="I want visible abs and to feel stronger" className="w-full input-field resize-y" />
              </label>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Deadline</span>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={deadlineEnabled} onChange={() => setDeadlineEnabled((v) => !v)} />
                  <span className="text-sm text-muted">I have a target date</span>
                </div>
                {deadlineEnabled && <input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} className="mt-2 w-full input-field" />}
              </label>
            </div>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell title="Current fitness" subtitle="This helps the coach match the starting point.">
            <div className="flex flex-col gap-4">
              <label className="block">
                <span className="text-sm text-muted mb-2 block">How would you describe yourself?</span>
                <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)} className="w-full input-field">
                  {EXPERIENCE_OPTIONS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">How long have you trained consistently?</span>
                <select value={trainingHistory} onChange={(e) => setTrainingHistory(e.target.value)} className="w-full input-field">
                  <option>Never</option>
                  <option>Less than 6 months</option>
                  <option>6–12 months</option>
                  <option>1–3 years</option>
                  <option>3+ years</option>
                </select>
              </label>
              <div className="block">
                <span className="text-sm text-muted mb-2 block">Activities you currently do</span>
                <div className="flex flex-wrap gap-2">
                  {['Weightlifting','Running','Sports','Walking','Cycling','Swimming','Calisthenics','CrossFit','None'].map((item) => (
                    <OptionChip key={item} label={item} selected={activities.includes(item)} onClick={() => toggle(activities, item, setActivities)} />
                  ))}
                </div>
              </div>
            </div>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell title="Benchmarks" subtitle="Optional, but helpful for better programming.">
            <div className="flex flex-col gap-4">
              <MaxRepField label="Max push-ups" value={maxPushups} onChange={setMaxPushups} />
              <MaxRepField label="Max pull-ups" value={maxPullups} onChange={setMaxPullups} />
              <MaxRepField label="Bench press" value={benchPress} onChange={setBenchPress} />
              <MaxRepField label="Squat" value={squat} onChange={setSquat} />
              <MaxRepField label="Deadlift" value={deadlift} onChange={setDeadlift} />
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Mile time</span>
                <input type="text" value={mileTime} onChange={(e) => setMileTime(e.target.value)} placeholder="e.g. 7:30" className="w-full input-field" />
              </label>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">100m time</span>
                <input type="text" value={hundredMTime} onChange={(e) => setHundredMTime(e.target.value)} placeholder="e.g. 14.2s" className="w-full input-field" />
              </label>
            </div>
          </StepShell>
        )}

        {step === 5 && (
          <StepShell title="Equipment & schedule" subtitle="We’ll match the plan to what you actually have and when you can train.">
            <div className="flex flex-col gap-4">
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Equipment you have</span>
                <p className="text-xs text-muted mb-3">Bodyweight only is exclusive. If you choose it, we will assume no gear beyond your body.</p>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_OPTIONS.map((e) => (
                    <OptionChip key={e.id} label={e.label} selected={equipment.includes(e.id)} onClick={() => toggleEquipment(e.id)} />
                  ))}
                </div>
              </label>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Days per week</span>
                <input type="range" min={1} max={6} value={daysPerWeek} onChange={(e) => setDaysPerWeek(parseInt(e.target.value))} className="w-full accent-signal" />
                <div className="text-sm text-muted mt-2">{daysPerWeek} days</div>
              </label>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Workout length</span>
                <select value={sessionLengthMin} onChange={(e) => setSessionLengthMin(parseInt(e.target.value))} className="w-full input-field">
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90+ min</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Preferred time</span>
                <select value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} className="w-full input-field">
                  <option>Morning</option>
                  <option>Afternoon</option>
                  <option>Evening</option>
                  <option>No preference</option>
                </select>
              </label>
              <div className="block">
                <span className="text-sm text-muted mb-2 block">Which days can you train?</span>
                <div className="flex flex-wrap gap-2">
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day) => (
                    <OptionChip key={day} label={day} selected={trainingDays.includes(day)} onClick={() => toggleTrainingDay(day)} />
                  ))}
                </div>
              </div>
            </div>
          </StepShell>
        )}

        {step === 6 && (
          <StepShell title="Nutrition & recovery" subtitle="The plan will adapt around your energy and recovery.">
            <div className="flex flex-col gap-4">
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Nutrition target</span>
                <select value={nutrition} onChange={(e) => setNutrition(e.target.value)} className="w-full input-field">
                  <option>Cutting</option>
                  <option>Bulking</option>
                  <option>Maintenance</option>
                  <option>Unsure</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Do you track calories?</span>
                <select value={caloriesTracked} onChange={(e) => setCaloriesTracked(e.target.value)} className="w-full input-field">
                  <option>Yes</option>
                  <option>No</option>
                  <option>Sometimes</option>
                </select>
              </label>
              <div className="block">
                <span className="text-sm text-muted mb-2 block">Food allergies</span>
                <div className="flex flex-wrap gap-2">
                  {['Gluten','Dairy','Peanuts','Tree nuts','Shellfish','Eggs','Soy','None'].map((item) => (
                    <OptionChip key={item} label={item} selected={allergies.includes(item)} onClick={() => toggle(allergies, item, setAllergies)} />
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Foods you dislike</span>
                <textarea value={dislikedFoods} onChange={(e) => setDislikedFoods(e.target.value)} rows={2} className="w-full input-field resize-y" />
              </label>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Cooking experience</span>
                <select value={cookingExperience} onChange={(e) => setCookingExperience(e.target.value)} className="w-full input-field">
                  <option>Never cook</option>
                  <option>Basic</option>
                  <option>Comfortable</option>
                  <option>Love cooking</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Average sleep (hours)</span>
                <input type="range" min={4} max={10} value={sleepHours} onChange={(e) => setSleepHours(parseInt(e.target.value))} className="w-full accent-signal" />
                <div className="text-sm text-muted mt-2">{sleepHours} hours</div>
              </label>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Sleep quality (1–10)</span>
                <input type="range" min={1} max={10} value={sleepQuality} onChange={(e) => setSleepQuality(parseInt(e.target.value))} className="w-full accent-signal" />
                <div className="text-sm text-muted mt-2">{sleepQuality}/10</div>
              </label>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Stress level (1–10)</span>
                <input type="range" min={1} max={10} value={stressLevel} onChange={(e) => setStressLevel(parseInt(e.target.value))} className="w-full accent-signal" />
                <div className="text-sm text-muted mt-2">{stressLevel}/10</div>
              </label>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Daily activity outside workouts</span>
                <select value={dailyActivity} onChange={(e) => setDailyActivity(e.target.value)} className="w-full input-field">
                  <option>Mostly sitting</option>
                  <option>Some walking</option>
                  <option>Very active</option>
                  <option>Physical job</option>
                </select>
              </label>
            </div>
          </StepShell>
        )}

        {step === 7 && (
          <StepShell title="Injuries & preferences" subtitle="We’ll avoid problem areas and keep the plan enjoyable.">
            <div className="flex flex-col gap-4">
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Any injuries?</span>
                <select value={injuryQuestion} onChange={(e) => setInjuryQuestion(e.target.value as "yes" | "no")} className="w-full input-field">
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>
              {injuryQuestion === "yes" && (
                <label className="block">
                  <span className="text-sm text-muted mb-2 block">What injuries?</span>
                  <textarea value={injuryNotes} onChange={(e) => setInjuryNotes(e.target.value)} rows={2} className="w-full input-field resize-y" />
                </label>
              )}
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Any exercises that hurt?</span>
                <textarea value={painExercises} onChange={(e) => setPainExercises(e.target.value)} rows={2} className="w-full input-field resize-y" />
              </label>
              <div className="block">
                <span className="text-sm text-muted mb-2 block">Workouts you enjoy</span>
                <div className="flex flex-wrap gap-2">
                  {['Strength','Bodybuilding','Running','HIIT','Calisthenics','Sports','Cycling','Swimming','Yoga','Stretching'].map((item) => (
                    <OptionChip key={item} label={item} selected={enjoyedWorkouts.includes(item)} onClick={() => toggle(enjoyedWorkouts, item, setEnjoyedWorkouts)} />
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Exercises you dislike</span>
                <textarea value={dislikedExercises} onChange={(e) => setDislikedExercises(e.target.value)} rows={2} className="w-full input-field resize-y" />
              </label>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Workout style</span>
                <select value={workoutStyle} onChange={(e) => setWorkoutStyle(e.target.value)} className="w-full input-field">
                  <option>Quick & intense</option>
                  <option>Balanced</option>
                  <option>Long & challenging</option>
                  <option>No preference</option>
                </select>
              </label>
            </div>
          </StepShell>
        )}

        {step === 8 && (
          <StepShell title="Accountability" subtitle="Choose the coaching style that keeps you going.">
            <div className="flex flex-col gap-4">
              <div className="block">
                <span className="text-sm text-muted mb-2 block">Which areas do you want to improve most?</span>
                <div className="flex flex-wrap gap-2">
                  {['Upper body','Lower body','Core','Push-ups','Pull-ups','Conditioning','Mobility','Speed'].map((item) => (
                    <OptionChip key={item} label={item} selected={focusAreas.includes(item)} onClick={() => toggle(focusAreas, item, setFocusAreas)} />
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Tap the muscle groups to emphasize</span>
                <MuscleMapSelector selected={targetMuscleGroups} onToggle={toggleMuscle} />
              </label>
              <div className="block">
                <span className="text-sm text-muted mb-2 block">How should your coach keep you accountable?</span>
                <div className="flex flex-wrap gap-2">
                  {['Daily reminders','Weekly check-ins','Progress graphs','Challenges','Streaks','Achievements','Motivational messages','Strict coaching','Gentle coaching','No reminders'].map((item) => (
                    <OptionChip key={item} label={item} selected={accountability.includes(item)} onClick={() => toggle(accountability, item, setAccountability)} />
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="text-sm text-muted mb-2 block">Pick your view</span>
                <div className="flex flex-col gap-3">
                  <OptionCard label="Beginner — simple effort sliders, form videos, streaks" selected={uiMode === "beginner"} onClick={() => setUiMode("beginner")} />
                  <OptionCard label="Advanced — RPE, volume load, velocity, plate math" selected={uiMode === "advanced"} onClick={() => setUiMode("advanced")} />
                </div>
              </label>
            </div>
          </StepShell>
        )}

        {error && (
          <p className="mt-6 text-sm text-deload" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-between mt-10">
          <button onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1} className="text-muted text-sm disabled:opacity-0">
            Back
          </button>
          {step < TOTAL_STEPS ? (
            <button onClick={() => setStep((s) => s + 1)} className="btn-primary !px-6 !py-3">
              Continue
            </button>
          ) : (
            <button onClick={finishOnboarding} disabled={saving} className="btn-primary !px-6 !py-3">
              {saving ? "Building your program..." : "Build my program"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function MaxRepField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm text-muted mb-2 block">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={200}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. 20"
        className="w-full input-field data-readout"
      />
    </label>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-1">{title}</h1>
      <p className="text-muted text-sm mb-8">{subtitle}</p>
      {children}
    </div>
  );
}

function OptionCard({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border px-4 py-3 text-sm transition-colors ${
        selected ? "border-signal bg-signal/10 text-signal" : "border-border text-ink hover:border-signal-dim bg-surface"
      }`}
    >
      {label}
    </button>
  );
}

function OptionChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-sm ${
        selected ? "border-signal bg-signal/10 text-signal" : "border-border text-ink bg-surface"
      }`}
    >
      {label}
    </button>
  );
}
