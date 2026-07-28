"use client";

import { useState } from "react";
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
  { id: "full_gym", label: "Full gym" },
  { id: "dumbbells", label: "Dumbbells" },
  { id: "barbell", label: "Barbell" },
  { id: "bands", label: "Resistance bands" },
  { id: "machines", label: "Machines" },
  { id: "bodyweight_only", label: "Bodyweight only" },
];

const EXPERIENCE_OPTIONS: { id: ExperienceLevel; label: string }[] = [
  { id: "new", label: "Brand new to training" },
  { id: "beginner", label: "Beginner — under a year" },
  { id: "intermediate", label: "Intermediate — 1-3 years" },
  { id: "advanced", label: "Advanced — 3+ years" },
];

const PLAN_LENGTH_OPTIONS: { id: PlanLengthWeeks; label: string }[] = [
  { id: 4, label: "4 weeks" },
  { id: 8, label: "8 weeks" },
  { id: 12, label: "12 weeks" },
  { id: 0, label: "Ongoing — no fixed end date" },
];

const TOTAL_STEPS = 9;

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

  function toggle<T>(list: T[], value: T, setter: (v: T[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function toggleMuscle(muscle: MuscleGroup) {
    setTargetMuscleGroups((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );
  }

  function parseMax(raw: string): number {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
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
      maxPushups: parseMax(maxPushups),
      maxPullups: parseMax(maxPullups),
      maxSitups: parseMax(maxSitups),
      targetMuscleGroups,
      planLengthWeeks,
      subscriptionTier: "free",
      xp: 0,
      level: 1,
      createdAt: Date.now(),
    };

    try {
      let program: ProgramState = initialProgramState(profile);

      try {
        const data = await postJson<{ program?: ProgramState }>("/api/generate-program", { profile });
        if (data.program?.weeklyTemplate?.length) {
          program = data.program;
        }
      } catch (groqErr) {
        console.error("Groq generate failed, using local program:", groqErr);
      }

      await setDoc(doc(db, "users", user.uid), profile);
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
          <StepShell title="What are you training for?" subtitle="Select all that apply.">
            <div className="grid grid-cols-2 gap-3">
              {GOALS.map((g) => (
                <OptionCard key={g.id} label={g.label} selected={goals.includes(g.id)} onClick={() => toggle(goals, g.id, setGoals)} />
              ))}
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title="How experienced are you?" subtitle="Be honest — this sets your starting loads.">
            <div className="flex flex-col gap-3">
              {EXPERIENCE_OPTIONS.map((e) => (
                <OptionCard key={e.id} label={e.label} selected={experienceLevel === e.id} onClick={() => setExperienceLevel(e.id)} />
              ))}
            </div>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell
            title="Bodyweight baselines"
            subtitle="Max unbroken reps right now — Groq uses these to size push-ups, pull-ups, and core work. Enter 0 if you can't do any yet."
          >
            <div className="flex flex-col gap-5">
              <MaxRepField label="Max push-ups" value={maxPushups} onChange={setMaxPushups} />
              <MaxRepField label="Max pull-ups" value={maxPullups} onChange={setMaxPullups} />
              <MaxRepField label="Max sit-ups" value={maxSitups} onChange={setMaxSitups} />
            </div>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell title="What equipment do you have access to?" subtitle="Select all that apply — this powers the Swap Engine.">
            <div className="grid grid-cols-2 gap-3">
              {EQUIPMENT_OPTIONS.map((e) => (
                <OptionCard key={e.id} label={e.label} selected={equipment.includes(e.id)} onClick={() => toggle(equipment, e.id, setEquipment)} />
              ))}
            </div>
          </StepShell>
        )}

        {step === 5 && (
          <StepShell title="Schedule" subtitle="How often and how long can you train?">
            <label className="block text-sm text-muted mb-2">
              Days per week: <span className="text-ink data-readout">{daysPerWeek}</span>
            </label>
            <input type="range" min={1} max={6} value={daysPerWeek} onChange={(e) => setDaysPerWeek(parseInt(e.target.value))} className="w-full accent-signal mb-8" />
            <label className="block text-sm text-muted mb-2">
              Session length: <span className="text-ink data-readout">{sessionLengthMin} min</span>
            </label>
            <input type="range" min={15} max={90} step={5} value={sessionLengthMin} onChange={(e) => setSessionLengthMin(parseInt(e.target.value))} className="w-full accent-signal" />
          </StepShell>
        )}

        {step === 6 && (
          <StepShell title="How long should this plan run?" subtitle="You can always adjust or extend it later.">
            <div className="flex flex-col gap-3">
              {PLAN_LENGTH_OPTIONS.map((p) => (
                <OptionCard key={p.id} label={p.label} selected={planLengthWeeks === p.id} onClick={() => setPlanLengthWeeks(p.id)} />
              ))}
            </div>
          </StepShell>
        )}

        {step === 7 && (
          <StepShell title="Anything you want extra emphasis on?" subtitle="Tap the diagram or the chips — including Traps on the back view. Optional.">
            <MuscleMapSelector selected={targetMuscleGroups} onToggle={toggleMuscle} />
          </StepShell>
        )}

        {step === 8 && (
          <StepShell title="Any injuries or areas to avoid loading?" subtitle="Optional — the program will route around these.">
            <div className="flex gap-2 mb-4">
              <input
                value={injuryDraft}
                onChange={(e) => setInjuryDraft(e.target.value)}
                placeholder="e.g. left shoulder"
                className="flex-1 bg-surface border border-border rounded-lg px-4 py-3 text-sm outline-none focus:border-signal"
              />
              <button
                type="button"
                onClick={() => {
                  if (!injuryDraft.trim()) return;
                  setInjuries([...injuries, { bodyPart: injuryDraft.trim(), severity: "avoid_loading" }]);
                  setInjuryDraft("");
                }}
                className="bg-surface2 border border-border px-4 rounded-lg text-sm hover:border-signal-dim"
              >
                Add
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {injuries.map((inj, i) => (
                <div key={i} className="flex justify-between items-center bg-surface rounded-lg px-4 py-2 text-sm">
                  <span>{inj.bodyPart}</span>
                  <button onClick={() => setInjuries(injuries.filter((_, idx) => idx !== i))} className="text-muted hover:text-ink">
                    Remove
                  </button>
                </div>
              ))}
              {injuries.length === 0 && <p className="text-xs text-muted">None added — you can add these later too.</p>}
            </div>
          </StepShell>
        )}

        {step === 9 && (
          <StepShell title="Choose your view" subtitle="You can switch this anytime in settings.">
            <div className="flex flex-col gap-3">
              <OptionCard label="Beginner — simple effort sliders, form videos, streaks" selected={uiMode === "beginner"} onClick={() => setUiMode("beginner")} />
              <OptionCard label="Advanced — RPE, volume load, velocity, plate math" selected={uiMode === "advanced"} onClick={() => setUiMode("advanced")} />
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
