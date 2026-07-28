"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { UserProfile, ProgramState } from "@/lib/types";
import { findExercise } from "@/lib/exercises";
import { effectiveStreak, hasCompletedSessionToday } from "@/lib/streaks";
import LoadMeter from "@/components/LoadMeter";
import StreakBadge from "@/components/StreakBadge";
import AppShell from "@/components/AppShell";
import { useWeightUnit } from "@/components/WeightUnitProvider";
import { getWeekKey, getWeeklyBonusXp, getXpRequiredForLevel, type XpState } from "@/lib/xp";

const HERO_IMG =
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80";

export default function DashboardPage() {
  const router = useRouter();
  const { displayWeight } = useWeightUnit();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [program, setProgram] = useState<ProgramState | null>(null);
  const [xpState, setXpState] = useState<XpState>({ xp: 0, level: 1 });
  const [showLevelUp, setShowLevelUp] = useState(false);
  const previousLevelRef = useRef(1);

  useEffect(() => {
    let isActive = true;
    let unsubProfile: (() => void) | null = null;
    let unsubProgram: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (isActive) router.replace("/login");
        return;
      }

      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
      if (unsubProgram) {
        unsubProgram();
        unsubProgram = null;
      }

      unsubProfile = onSnapshot(
        doc(db, "users", user.uid),
        (snap) => {
          if (!isActive) return;
          if (snap.exists()) {
            const nextProfile = snap.data() as UserProfile;
            setProfile(nextProfile);
            const nextLevel = nextProfile.level ?? 1;
            const nextXp = nextProfile.xp ?? 0;
            setXpState({
              xp: nextXp,
              level: nextLevel,
              lastWeeklyBonusWeek: nextProfile.lastWeeklyBonusWeek,
            });
          }
        },
        (err) => {
          console.error("Failed to subscribe to profile", err);
        }
      );

      unsubProgram = onSnapshot(
        doc(db, "users", user.uid, "programState", "current"),
        (snap) => {
          if (!isActive) return;
          if (snap.exists()) setProgram(snap.data() as ProgramState);
        },
        (err) => {
          console.error("Failed to subscribe to program state", err);
        }
      );
    });
    return () => {
      isActive = false;
      unsubAuth();
      unsubProfile?.();
      unsubProgram?.();
    };
  }, [router]);

  useEffect(() => {
    if (xpState.level > previousLevelRef.current && xpState.level > 1) {
      setShowLevelUp(true);
      const timer = window.setTimeout(() => setShowLevelUp(false), 2200);
      return () => window.clearTimeout(timer);
    }
    previousLevelRef.current = xpState.level;
  }, [xpState.level]);

  if (!profile || !program) {
    return (
      <AppShell>
        <main className="min-h-[60vh] flex items-center justify-center text-muted text-sm">
          Loading your program...
        </main>
      </AppShell>
    );
  }

  const nextSession = program.weeklyTemplate[program.currentDayIndex];
  const planLabel =
    program.planLengthWeeks === 0
      ? `Week ${program.weekNumber}`
      : `Week ${program.weekNumber} of ${program.planLengthWeeks}`;
  const displayedStreak = effectiveStreak(profile, new Date());
  const alreadyTrainedToday = hasCompletedSessionToday(profile);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = profile.displayName?.split(" ")[0] || "Athlete";
  const sessionTitle = alreadyTrainedToday
    ? "Rest day — see you tomorrow"
    : program.isDeloadWeek
      ? "Recovery day"
      : nextSession.focus;
  const currentXp = xpState.xp;
  const currentLevel = xpState.level;
  const xpToNextLevel = getXpRequiredForLevel(currentLevel) - currentXp;
  const levelProgressPercent = Math.min(100, Math.round((currentXp / getXpRequiredForLevel(currentLevel)) * 100));
  const weeklyKey = getWeekKey(new Date());
  const weeklyBonusReady = xpState.lastWeeklyBonusWeek !== weeklyKey;

  return (
    <AppShell>
      <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-6xl mx-auto w-full">
        {/* Mobile greeting */}
        <div className="lg:hidden flex items-center justify-between mb-5">
          <div>
            <p className="text-ink text-sm">{greeting},</p>
            <h1 className="font-display font-bold text-2xl">{firstName}</h1>
          </div>
          <StreakBadge streak={displayedStreak} compact />
        </div>

        {/* Desktop hero */}
        <section className="hidden lg:grid lg:grid-cols-[1.2fr_0.8fr] gap-6 mb-6">
          <div className="card p-8 relative overflow-hidden">
            <p className="text-sm text-ink mb-2 font-medium">{planLabel} · {profile.uiMode} view</p>
            <h1 className="font-display font-extrabold text-3xl xl:text-4xl leading-tight mb-3 max-w-xl text-ink">
              Every set you log rewrites{" "}
              <span className="text-signal">tomorrow&apos;s</span> workout.
            </h1>
            <p className="text-ink text-sm max-w-md mb-6 font-medium">
              {alreadyTrainedToday
                ? "Session complete for today. Your program and streak unlock again tomorrow."
                : `Up next: ${sessionTitle}. The Progressive Overload Engine adjusts from what you actually logged.`}
            </p>
            <div className="flex flex-wrap gap-3">
              {alreadyTrainedToday ? (
                <span className="btn-secondary opacity-60 cursor-not-allowed">Session done for today</span>
              ) : (
                <Link href="/log" className="btn-primary">
                  Start a session
                </Link>
              )}
              <Link href="/pricing" className="btn-secondary">
                See plans
              </Link>
            </div>
          </div>

          <div className="relative card overflow-hidden min-h-[220px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO_IMG}
              alt="Training equipment"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
            <div className="absolute top-4 right-4 card px-3 py-2.5 flex items-center gap-3 shadow-soft">
              <StreakBadge streak={displayedStreak} />
              {!alreadyTrainedToday && (
                <Link href="/log" className="btn-primary !py-2 !px-3 text-xs">
                  Start session
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Mobile start CTA */}
        <section className="lg:hidden mb-5">
          {alreadyTrainedToday ? (
            <div className="card p-5 bg-surface2">
              <p className="font-display font-bold text-lg mb-1 text-ink">Session done for today</p>
              <p className="text-sm text-ink">Come back tomorrow to keep your streak and advance the program.</p>
            </div>
          ) : (
            <Link
              href="/log"
              className="block relative overflow-hidden rounded-2xl bg-signal text-white p-5 shadow-soft min-h-[140px]"
            >
              <p className="text-sm text-white/80 mb-1">Up next</p>
              <p className="font-display font-bold text-xl mb-4 max-w-[70%]">{sessionTitle}</p>
              <span className="inline-flex bg-white text-signal font-semibold text-sm px-4 py-2 rounded-xl">
                Start today&apos;s session
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={HERO_IMG}
                alt=""
                className="absolute right-0 bottom-0 w-36 h-36 object-cover rounded-tl-3xl opacity-90"
              />
            </Link>
          )}
        </section>

        {/* Feature strip — desktop */}
        <section className="hidden lg:grid grid-cols-3 gap-4 mb-6">
          {[
            { title: "Log by voice", body: "Hands-free set capture between lifts.", tone: "bg-signal/10 text-signal" },
            { title: "Auto-deload", body: "Backs off before you burn out.", tone: "bg-success/10 text-success" },
            { title: "No equipment, no problem", body: "Same pattern, what you have today.", tone: "bg-deload/10 text-deload" },
          ].map((f) => (
            <div key={f.title} className="card p-5 flex gap-4 items-start shadow-soft border border-border/70 bg-surface/90">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${f.tone}`}>
                <span className="text-lg leading-none">•</span>
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm mb-1 text-ink">{f.title}</h3>
                <p className="text-sm leading-relaxed text-ink">{f.body}</p>
              </div>
            </div>
          ))}
        </section>

        {program.isDeloadWeek && program.deloadReason && !alreadyTrainedToday && (
          <div className="border border-deload/40 bg-deload/10 rounded-2xl px-4 py-3 mb-6 text-sm text-deload">
            {program.deloadReason}
          </div>
        )}

        <section className="mb-6 rounded-3xl border border-border/70 bg-surface/90 p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">XP & leveling</p>
              <p className="text-sm text-ink">Every completed session earns XP. Finish the week to collect a bonus.</p>
            </div>
            <div className="rounded-2xl border border-signal/30 bg-signal/10 px-3 py-2 text-sm font-semibold text-signal">
              Level {currentLevel}
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-ink font-medium">{currentXp} XP</span>
              <span className="text-ink font-medium">{xpToNextLevel > 0 ? `${xpToNextLevel} XP to next level` : "Ready for the next level"}</span>
            </div>
            <div className="h-3 rounded-full bg-surface2 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-signal to-success transition-all duration-700" style={{ width: `${levelProgressPercent}%` }} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="rounded-2xl border border-border bg-surface2 px-3 py-2 text-sm text-ink">
              Session XP: +50
            </div>
            <div className={`rounded-2xl border px-3 py-2 text-sm ${weeklyBonusReady ? "border-success/40 bg-success/10 text-success" : "border-border bg-surface2 text-ink"}`}>
              Weekly bonus: {weeklyBonusReady ? `+${getWeeklyBonusXp()} XP available` : "claimed"}
            </div>
          </div>
          {showLevelUp && (
            <div className="relative mt-4 overflow-hidden rounded-2xl border border-signal/40 bg-gradient-to-br from-signal/20 via-surface to-success/15 px-4 py-4 text-sm font-semibold text-signal animate-pop-burst">
              <div className="pointer-events-none absolute inset-0">
                {Array.from({ length: 8 }).map((_, index) => (
                  <span
                    key={index}
                    className="absolute top-1/2 left-1/2 h-2.5 w-2.5 rounded-full bg-signal/70 animate-float-up"
                    style={{ left: `${20 + index * 10}%`, animationDelay: `${index * 0.06}s` }}
                  />
                ))}
              </div>
              <div className="relative z-10">Level up! You reached level {currentLevel}.</div>
            </div>
          )}
        </section>

        {/* Data grid */}
        <section className="grid lg:grid-cols-3 gap-4 mb-6">
          <div className="card p-5">
            <LoadMeter
              title={nextSession.focus.split("—")[0]?.trim() || "Volume"}
              lastVolumeLoad={program.lastVolumeLoad}
              trailingVolumeLoad={program.trailingVolumeLoad}
              isDeloadWeek={program.isDeloadWeek}
              mode={profile.uiMode}
            />
          </div>

          <div className="card p-5">
            <h3 className="font-display font-semibold text-base mb-4 text-ink">
              {alreadyTrainedToday ? "Tomorrow's prescription" : "Today's prescription"}
            </h3>
            <div className="flex flex-col divide-y divide-border">
              {nextSession.exercises.map((ex) => {
                const def = findExercise(ex.exerciseId);
                return (
                  <div key={ex.exerciseId} className="py-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-ink">{def?.name ?? ex.exerciseId}</span>
                    <span className="data-readout text-sm text-ink whitespace-nowrap">
                      {ex.sets} × {ex.reps}
                      {ex.targetWeightKg > 0 ? ` @ ${displayWeight(ex.targetWeightKg)}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-display font-semibold text-base mb-4 text-ink">This week</h3>
            <div className="flex flex-col divide-y divide-border">
              {program.weeklyTemplate.map((day, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between text-sm gap-2">
                  <span className={i === program.currentDayIndex ? "text-ink font-semibold" : "text-ink/90"}>
                    Day {i + 1} — {day.focus}
                  </span>
                  {i === program.currentDayIndex && (
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-signal bg-signal/10 px-2 py-1 rounded-full shrink-0">
                      {alreadyTrainedToday ? "Tomorrow" : "Up next"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {!alreadyTrainedToday && (
          <div className="hidden lg:flex justify-end">
            <Link href="/log" className="btn-primary">
              Start session
            </Link>
          </div>
        )}
      </main>
    </AppShell>
  );
}
