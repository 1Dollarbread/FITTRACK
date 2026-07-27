"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, collection, addDoc, getDocs, orderBy, query } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { UserProfile, ProgramState, SetLog, WorkoutSession } from "@/lib/types";
import { findExercise, swapExercise } from "@/lib/exercises";
import { parseVoiceCapture, startVoiceCapture } from "@/lib/voiceParser";
import { computeNextProgramState } from "@/lib/programGenerator";
import { postJson } from "@/lib/apiClient";
import { updateStreakOnSession, hasCompletedSessionToday, localDateKey } from "@/lib/streaks";
import EffortInput from "@/components/EffortInput";
import AppShell from "@/components/AppShell";
import { useWeightUnit } from "@/components/WeightUnitProvider";

export default function LogPage() {
  const router = useRouter();
  const { displayWeight, toDisplayValue } = useWeightUnit();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [program, setProgram] = useState<ProgramState | null>(null);
  const [loggedSets, setLoggedSets] = useState<SetLog[]>([]);
  const [voiceStatus, setVoiceStatus] = useState<string>("");
  const [effort, setEffort] = useState<{ effortRating?: "easy" | "medium" | "hard"; rpe?: number }>({});
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [setError, setSetError] = useState<Record<string, string>>({});
  const [wentWell, setWentWell] = useState("");
  const [toImprove, setToImprove] = useState("");
  // Draft weight/reps per exercise, for the manual "add set" row.
  const [drafts, setDrafts] = useState<Record<string, { weightKg: string; reps: string }>>({});

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      getDoc(doc(db, "users", user.uid)).then((s) => {
        if (!s.exists()) return;
        const p = s.data() as UserProfile;
        if (hasCompletedSessionToday(p)) {
          router.replace("/dashboard");
          return;
        }
        setProfile(p);
      });
      getDoc(doc(db, "users", user.uid, "programState", "current")).then(
        (s) => s.exists() && setProgram(s.data() as ProgramState)
      );
    });
    return () => unsubAuth();
  }, [router]);

  const nextSession = program?.weeklyTemplate[program.currentDayIndex];

  function draftFor(exerciseId: string) {
    return drafts[exerciseId] ?? { weightKg: "", reps: "" };
  }

  function updateDraft(exerciseId: string, field: "weightKg" | "reps", value: string) {
    setDrafts((prev) => ({ ...prev, [exerciseId]: { ...draftFor(exerciseId), [field]: value } }));
  }

  function addManualSet(exerciseId: string) {
    const draft = draftFor(exerciseId);
    const reps = parseInt(draft.reps, 10);
    const weightKg = draft.weightKg.trim() === "" ? 0 : parseFloat(draft.weightKg);
    if (!Number.isFinite(reps) || reps <= 0) {
      setSetError((prev) => ({ ...prev, [exerciseId]: "Enter a rep count greater than 0." }));
      return;
    }
    if (draft.weightKg.trim() !== "" && (Number.isNaN(weightKg) || weightKg < 0)) {
      setSetError((prev) => ({ ...prev, [exerciseId]: "Weight must be 0 or more." }));
      return;
    }
    setSetError((prev) => {
      const { [exerciseId]: _omit, ...rest } = prev;
      return rest;
    });
    setLoggedSets((prev) => [
      ...prev,
      {
        exerciseId,
        setNumber: prev.filter((s) => s.exerciseId === exerciseId).length + 1,
        reps,
        weightKg: Number.isNaN(weightKg) ? 0 : weightKg,
      },
    ]);
    setDrafts((prev) => ({ ...prev, [exerciseId]: { weightKg: draft.weightKg, reps: "" } }));
  }

  function removeSet(exerciseId: string, setNumber: number) {
    setLoggedSets((prev) => prev.filter((s) => !(s.exerciseId === exerciseId && s.setNumber === setNumber)));
  }

  function handleVoiceCapture() {
    setVoiceStatus("Listening...");
    startVoiceCapture(
      (transcript) => {
        const parsed = parseVoiceCapture(transcript);
        if (parsed.type === "set") {
          setLoggedSets((prev) => [
            ...prev,
            {
              exerciseId: parsed.exerciseId,
              setNumber: prev.filter((s) => s.exerciseId === parsed.exerciseId).length + 1,
              reps: parsed.reps,
              weightKg: parsed.weightKg,
            },
          ]);
          setVoiceStatus(`Logged: ${parsed.exerciseName} — ${parsed.weightKg}kg × ${parsed.reps}`);
        } else if (parsed.type === "meal") {
          setVoiceStatus(`Logged meal: ${parsed.items.join(", ")}`);
        } else {
          setVoiceStatus(`Didn't catch that clearly: "${parsed.raw}"`);
        }
      },
      (err) => setVoiceStatus(err)
    );
  }

  function handleSwap(exerciseId: string) {
    if (!profile) return;
    const swapped = swapExercise(swaps[exerciseId] ?? exerciseId, profile.equipment);
    if (swapped) setSwaps((prev) => ({ ...prev, [exerciseId]: swapped.id }));
  }

  async function finishSession() {
    const user = auth.currentUser;
    if (!user || !profile || !program || !nextSession) return;

    if (hasCompletedSessionToday(profile)) {
      setSaveError("You already finished a session today. Come back tomorrow.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const feedback =
      wentWell.trim() || toImprove.trim()
        ? {
            ...(wentWell.trim() ? { wentWell: wentWell.trim() } : {}),
            ...(toImprove.trim() ? { toImprove: toImprove.trim() } : {}),
          }
        : undefined;

    const session: WorkoutSession = {
      id: crypto.randomUUID(),
      date: Date.now(),
      exercises: effort.rpe ? loggedSets.map((s) => ({ ...s, rpe: effort.rpe })) : loggedSets,
      loggedVia: "manual",
      ...(effort.effortRating ? { effortRating: effort.effortRating } : {}),
      ...(feedback ? { feedback } : {}),
    };

    try {
      // Re-read profile so a second tab can't double-advance the program.
      const freshSnap = await getDoc(doc(db, "users", user.uid));
      const freshProfile = freshSnap.exists() ? (freshSnap.data() as UserProfile) : profile;
      if (hasCompletedSessionToday(freshProfile)) {
        setSaveError("You already finished a session today. Come back tomorrow.");
        setSaving(false);
        router.replace("/dashboard");
        return;
      }

      const sessionsRef = collection(db, "users", user.uid, "sessions");
      await addDoc(sessionsRef, session);

      const historySnap = await getDocs(query(sessionsRef, orderBy("date", "asc")));
      const history = historySnap.docs.map((d) => d.data() as WorkoutSession);

      let nextState = computeNextProgramState(program, session, freshProfile, history);
      let updatedProfile = freshProfile;
      const todayKey = localDateKey(new Date());

      try {
        const data = await postJson<{ program?: ProgramState; profile?: UserProfile }>(
          "/api/adjust-program",
          {
            profile: freshProfile,
            currentState: program,
            session,
            history,
            clientLocalDate: todayKey,
          }
        );
        if (data.program?.weeklyTemplate?.length) {
          nextState = data.program;
        }
        if (data.profile) {
          updatedProfile = data.profile;
        }
      } catch (groqErr) {
        const msg = groqErr instanceof Error ? groqErr.message : "";
        if (msg.includes("409") || msg.toLowerCase().includes("already completed")) {
          setSaveError("You already finished a session today. Come back tomorrow.");
          router.replace("/dashboard");
          return;
        }
        console.error("Groq adjust failed, using local overload:", groqErr);
        // Only advance streak/program locally if we haven't already logged today.
        if (!hasCompletedSessionToday(freshProfile)) {
          const s = updateStreakOnSession(freshProfile, new Date());
          updatedProfile = { ...freshProfile, streak: s.streak, lastStreakDay: s.lastStreakDay };
        } else {
          router.replace("/dashboard");
          return;
        }
      }

      await setDoc(doc(db, "users", user.uid), updatedProfile);
      await setDoc(doc(db, "users", user.uid, "programState", "current"), nextState);
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      setSaveError(
        err instanceof Error
          ? err.message
          : "Could not save this session. Check your connection and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!profile || !program || !nextSession) {
    return (
      <AppShell title="Session">
        <main className="min-h-[50vh] flex items-center justify-center text-muted text-sm">
          Loading session...
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell title="Log session">
      <main className="px-4 sm:px-6 lg:px-10 py-6 max-w-2xl mx-auto w-full">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="text-sm text-muted hover:text-ink mb-4 inline-flex items-center gap-1"
        >
          ← Back
        </button>
        <h1 className="font-display font-bold text-2xl mb-1">{nextSession.focus}</h1>
        <p className="text-muted text-sm mb-6">Log your sets</p>

        <button
          onClick={handleVoiceCapture}
          className="w-full mb-2 card px-4 py-3.5 text-sm font-medium text-signal flex items-center justify-center gap-2 hover:border-signal transition-colors"
        >
          <MicIcon className="w-4 h-4" />
          Hold to speak a set — e.g. &quot;bench press 60 for 8&quot;
        </button>
        {voiceStatus && <p className="text-xs text-muted mb-6">{voiceStatus}</p>}
        {!voiceStatus && <div className="mb-6" />}

        <div className="flex flex-col gap-4 mb-6">
          {nextSession.exercises.map((ex) => {
            const activeId = swaps[ex.exerciseId] ?? ex.exerciseId;
            const def = findExercise(activeId);
            const setsForThis = loggedSets.filter((s) => s.exerciseId === activeId);
            const draft = draftFor(activeId);
            const isBodyweightOrBand = ex.targetWeightKg === 0;

            return (
              <div key={ex.exerciseId} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{def?.name}</span>
                  <button
                    onClick={() => handleSwap(ex.exerciseId)}
                    className="text-xs text-signal hover:text-signal-bright font-medium"
                  >
                    Swap
                  </button>
                </div>
                <p className="data-readout text-xs text-muted mb-3">
                  Target: {ex.sets} × {ex.reps}
                  {ex.targetWeightKg > 0 ? ` @ ${displayWeight(ex.targetWeightKg)}` : " (bodyweight / band)"}
                </p>

                <div className="flex gap-2 mb-1">
                  {!isBodyweightOrBand && (
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder={displayWeight(0).slice(-2) === "lb" ? "lb" : "kg"}
                      value={draft.weightKg}
                      onChange={(e) => updateDraft(activeId, "weightKg", e.target.value)}
                      className="w-20 input-field !py-2 data-readout"
                    />
                  )}
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="reps"
                    value={draft.reps}
                    onChange={(e) => updateDraft(activeId, "reps", e.target.value)}
                    className="w-20 input-field !py-2 data-readout"
                  />
                  <button
                    onClick={() => addManualSet(activeId)}
                    className="flex-1 btn-secondary !py-2"
                  >
                    Add set
                  </button>
                </div>
                {setError[activeId] && (
                  <p className="text-xs text-deload mb-2" role="alert">
                    {setError[activeId]}
                  </p>
                )}

                {setsForThis.length > 0 && (
                  <div className="flex flex-col gap-1 mt-2">
                    {setsForThis.map((s) => (
                      <div
                        key={s.setNumber}
                        className="flex items-center justify-between text-xs data-readout text-signal"
                      >
                        <span>
                          Set {s.setNumber}: {s.weightKg > 0 ? `${toDisplayValue(s.weightKg)}${displayWeight(0).slice(-2) === "lb" ? "lb" : "kg"} × ` : ""}
                          {s.reps} reps
                        </span>
                        <button
                          onClick={() => removeSet(activeId, s.setNumber)}
                          className="text-muted hover:text-ink"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="card p-4 mb-4">
          <p className="text-sm font-medium mb-3">Session effort</p>
          <EffortInput mode={profile.uiMode} onChange={setEffort} />
        </div>

        <div className="card p-4 mb-4">
          <h2 className="font-display font-semibold text-sm mb-1">How did it go?</h2>
          <p className="text-xs text-muted mb-4">
            Optional — feedback reshapes your next sessions.
          </p>
          <label className="block mb-4">
            <span className="text-xs text-muted mb-1.5 block">What went well</span>
            <textarea
              value={wentWell}
              onChange={(e) => setWentWell(e.target.value)}
              rows={3}
              placeholder="e.g. Pull-ups felt strong, energy was good"
              className="input-field resize-y"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted mb-1.5 block">What could be improved</span>
            <textarea
              value={toImprove}
              onChange={(e) => setToImprove(e.target.value)}
              rows={3}
              placeholder="e.g. Lower back got sore on RDLs, want more core"
              className="input-field resize-y"
            />
          </label>
        </div>

        {saveError && (
          <p className="text-sm text-deload mb-4" role="alert">
            {saveError}
          </p>
        )}

        <button
          onClick={finishSession}
          disabled={saving || loggedSets.length === 0}
          className="w-full btn-primary !py-3.5"
        >
          {saving ? "Updating your program..." : "Finish session"}
        </button>
      </main>
    </AppShell>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" strokeLinecap="round" />
    </svg>
  );
}
