"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, collection, addDoc, getDocs, orderBy, query, limit } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { UserProfile, ProgramState, SessionBriefing, SetLog, WorkoutSession } from "@/lib/types";
import { findExercise, swapExercise } from "@/lib/exercises";
import { getExerciseFormInfo } from "@/lib/exerciseMedia";
import { parseVoiceCapture, startVoiceCapture } from "@/lib/voiceParser";
import { computeNextProgramState } from "@/lib/programGenerator";
import { postJson } from "@/lib/apiClient";
import { updateStreakOnSession, hasCompletedSessionToday, localDateKey } from "@/lib/streaks";
import { awardWorkoutXp, awardWeeklyBonus, getWeekKey, type XpState } from "@/lib/xp";
import EffortInput from "@/components/EffortInput";
import AppShell from "@/components/AppShell";
import { useWeightUnit } from "@/components/WeightUnitProvider";

function getExerciseMediaGallery(exerciseId: string, primarySrc: string) {
  // Gallery progression images are only shown when we have real distinct views.
  // If an exercise has no verified second shot, only the primary image is returned.
  return [primarySrc];
}

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
  const [xpState, setXpState] = useState<XpState>({ xp: 0, level: 1 });
  const [briefing, setBriefing] = useState<SessionBriefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [helpExerciseId, setHelpExerciseId] = useState<string | null>(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  // Draft weight/reps per exercise, for the manual "add set" row.
  const [drafts, setDrafts] = useState<Record<string, { weightKg: string; reps: string; seconds: string }>>({});

  useEffect(() => {
    setSelectedMediaIndex(0);
  }, [helpExerciseId]);

  useEffect(() => {
    if (!profile) return;
    setXpState({
      xp: profile.xp ?? 0,
      level: profile.level ?? 1,
      lastWeeklyBonusWeek: profile.lastWeeklyBonusWeek,
    });
  }, [profile]);

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

  // Coach's pre-session briefing: form cues, what to expect, and how the
  // athlete should feel after — grounded in their recent logged sessions.
  useEffect(() => {
    if (!profile || !program) return;
    const session = program.weeklyTemplate[program.currentDayIndex];
    if (!session) return;
    const user = auth.currentUser;
    if (!user) return;

    let cancelled = false;
    setBriefingLoading(true);
    setBriefingError(null);

    (async () => {
      try {
        const sessionsRef = collection(db, "users", user.uid, "sessions");
        const historySnap = await getDocs(query(sessionsRef, orderBy("date", "desc"), limit(8)));
        const recentHistory = historySnap.docs.map((d) => d.data() as WorkoutSession).reverse();

        const data = await postJson<{ briefing: SessionBriefing }>("/api/session-briefing", {
          profile,
          session,
          history: recentHistory,
          isDeloadWeek: program.isDeloadWeek,
          deloadReason: program.deloadReason,
        });
        if (!cancelled) setBriefing(data.briefing);
      } catch (err) {
        console.error("Failed to load session briefing:", err);
        if (!cancelled) {
          setBriefingError("Coach briefing is unavailable right now — your session targets below are still accurate.");
        }
      } finally {
        if (!cancelled) setBriefingLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile, program]);

  function draftFor(exerciseId: string) {
    return drafts[exerciseId] ?? { weightKg: "", reps: "", seconds: "" };
  }

  function updateDraft(exerciseId: string, field: "weightKg" | "reps" | "seconds", value: string) {
    setDrafts((prev) => ({ ...prev, [exerciseId]: { ...draftFor(exerciseId), [field]: value } }));
  }

  function isTimeBasedExercise(exerciseId: string) {
    const def = findExercise(exerciseId);
    const label = `${def?.name ?? ""} ${def?.id ?? ""}`.toLowerCase();
    return label.includes("plank") || label.includes("hold") || label.includes("static");
  }

  function addManualSet(exerciseId: string) {
    const draft = draftFor(exerciseId);
    const repTarget = parseInt(draft.reps, 10);
    const seconds = draft.seconds.trim() === "" ? null : parseInt(draft.seconds, 10);
    const weightKg = draft.weightKg.trim() === "" ? 0 : parseFloat(draft.weightKg);
    const usesSeconds = isTimeBasedExercise(exerciseId);

    if (usesSeconds) {
      if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
        setSetError((prev) => ({ ...prev, [exerciseId]: "Enter a hold time greater than 0 seconds." }));
        return;
      }
    } else if (!Number.isFinite(repTarget) || repTarget <= 0) {
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
        reps: usesSeconds ? 0 : (Number.isNaN(repTarget) ? 0 : repTarget),
        weightKg: Number.isNaN(weightKg) ? 0 : weightKg,
        ...(usesSeconds && seconds != null ? { seconds } : {}),
      },
    ]);
    setDrafts((prev) => ({ ...prev, [exerciseId]: { weightKg: draft.weightKg, reps: "", seconds: "" } }));
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

      const currentWeekKey = getWeekKey(new Date());
      const completedThisWeek = history.filter((session) => getWeekKey(new Date(session.date)) === currentWeekKey).length;
      const workoutXpResult = awardWorkoutXp(xpState);
      const weeklyBonusResult =
        completedThisWeek >= program.weeklyTemplate.length
          ? awardWeeklyBonus(workoutXpResult, currentWeekKey)
          : { ...workoutXpResult, lastWeeklyBonusWeek: xpState.lastWeeklyBonusWeek };
      setXpState({ xp: weeklyBonusResult.xp, level: weeklyBonusResult.level, lastWeeklyBonusWeek: weeklyBonusResult.lastWeeklyBonusWeek });

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

      const profilePayload = {
        ...updatedProfile,
        ...(typeof weeklyBonusResult.xp === "number" ? { xp: weeklyBonusResult.xp } : {}),
        ...(typeof weeklyBonusResult.level === "number" ? { level: weeklyBonusResult.level } : {}),
        ...(weeklyBonusResult.lastWeeklyBonusWeek ? { lastWeeklyBonusWeek: weeklyBonusResult.lastWeeklyBonusWeek } : {}),
      };
      await setDoc(doc(db, "users", user.uid), profilePayload);
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

        {(briefingLoading || briefingError || briefing) && (
          <div className="card p-4 mb-4 border-signal/30 bg-signal/5">
            <h2 className="font-display font-semibold text-sm mb-3 text-signal">Coach briefing</h2>
            {briefingLoading && <p className="text-xs text-muted">Putting today's briefing together...</p>}
            {!briefingLoading && briefingError && <p className="text-xs text-muted">{briefingError}</p>}
            {!briefingLoading && briefing && (
              <div className="flex flex-col gap-3 text-sm">
                <div>
                  <p className="text-xs font-medium text-muted mb-1">Form focus</p>
                  <ul className="flex flex-col gap-1">
                    {briefing.formCues.map((cue, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-signal">•</span>
                        <span>{cue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted mb-1">What to expect</p>
                  <p>{briefing.whatToExpect}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted mb-1">How you should feel after</p>
                  <p>{briefing.afterFeeling}</p>
                </div>
              </div>
            )}
          </div>
        )}

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
            const helpInfo = getExerciseFormInfo(activeId);
            const setsForThis = loggedSets.filter((s) => s.exerciseId === activeId);
            const draft = draftFor(activeId);
            const isBodyweightOrBand = ex.targetWeightKg === 0;

            return (
              <div key={ex.exerciseId} className="card p-4">
                <div className="flex items-center justify-between mb-2 gap-3">
                  <span className="font-semibold text-sm">{def?.name}</span>
                  <div className="flex items-center gap-2">
                    {helpInfo ? (
                      <button
                        onClick={() => setHelpExerciseId(activeId)}
                        className="text-xs text-muted hover:text-ink font-medium"
                      >
                        Form
                      </button>
                    ) : null}
                    <button
                      onClick={() => handleSwap(ex.exerciseId)}
                      className="text-xs text-signal hover:text-signal-bright font-medium"
                    >
                      Swap
                    </button>
                  </div>
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
                  {isTimeBasedExercise(activeId) ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="sec"
                      value={draft.seconds}
                      onChange={(e) => updateDraft(activeId, "seconds", e.target.value)}
                      className="w-24 input-field !py-2 data-readout"
                    />
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="reps"
                      value={draft.reps}
                      onChange={(e) => updateDraft(activeId, "reps", e.target.value)}
                      className="w-20 input-field !py-2 data-readout"
                    />
                  )}
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
                          {s.seconds ? `${s.seconds} sec` : `${s.reps} reps`}
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

        {helpExerciseId && (() => {
          const helpInfo = getExerciseFormInfo(helpExerciseId);
          const helpExerciseDef = findExercise(helpExerciseId);
          if (!helpInfo) return null;
          const gallery = getExerciseMediaGallery(helpExerciseId, helpInfo.media.src);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
                onClick={() => setHelpExerciseId(null)}
              />
              <div
                className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto card p-6"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="font-display font-semibold text-xl">
                      {helpExerciseDef?.name ?? "Exercise form"}
                    </h2>
                    <p className="text-xs text-muted mt-1">{helpInfo.media.caption}</p>
                  </div>
                  <button
                    onClick={() => setHelpExerciseId(null)}
                    className="text-sm text-muted hover:text-ink"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="rounded-3xl overflow-hidden bg-surface/80">
                    {helpInfo.media.type === "image" ? (
                      <>
                        <div className="relative w-full h-[320px]">
                          <Image
                            src={gallery[selectedMediaIndex] ?? helpInfo.media.src}
                            alt={helpInfo.media.alt}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 768px"
                            unoptimized
                          />
                        </div>
                        {gallery.length > 1 && (
                          <div className="flex flex-wrap gap-2 p-3 border-t border-border bg-surface/70">
                            {gallery.map((imagePath, index) => (
                              <button
                                key={imagePath}
                                type="button"
                                onClick={() => setSelectedMediaIndex(index)}
                                className={`w-16 h-16 overflow-hidden rounded-xl border ${selectedMediaIndex === index ? "border-signal" : "border-border"}`}
                              >
                                <Image
                                  src={imagePath}
                                  alt={`${helpInfo.media.alt} view ${index + 1}`}
                                  width={64}
                                  height={64}
                                  className="object-cover w-full h-full"
                                  unoptimized
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : helpInfo.media.type === "video" ? (
                      <video
                        controls
                        poster={helpInfo.media.poster}
                        className="w-full h-[320px] object-cover"
                      >
                        <source src={helpInfo.media.src} type="video/mp4" />
                      </video>
                    ) : (
                      <div className="relative aspect-video">
                        <iframe
                          className="absolute inset-0 w-full h-full"
                          src={helpInfo.media.src}
                          title={`${helpExerciseDef?.name ?? "Exercise"} form video`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed">{helpInfo.instructions}</p>
                    <ul className="space-y-2 text-sm">
                      {helpInfo.details.map((detail) => (
                        <li key={detail} className="flex gap-2">
                          <span className="text-signal">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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
