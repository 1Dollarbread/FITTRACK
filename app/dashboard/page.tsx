"use client";

import { useEffect, useState } from "react";
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

const HERO_IMG =
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80";

export default function DashboardPage() {
  const router = useRouter();
  const { displayWeight } = useWeightUnit();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [program, setProgram] = useState<ProgramState | null>(null);

  useEffect(() => {
    let isActive = true;
    let unsubProgram: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (isActive) router.replace("/login");
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!isActive) return;
        if (snap.exists()) setProfile(snap.data() as UserProfile);
      } catch (err) {
        console.error("Failed to load dashboard profile", err);
      }

      if (unsubProgram) {
        unsubProgram();
        unsubProgram = null;
      }

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
      unsubProgram?.();
    };
  }, [router]);

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

  return (
    <AppShell>
      <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-6xl mx-auto w-full">
        {/* Mobile greeting */}
        <div className="lg:hidden flex items-center justify-between mb-5">
          <div>
            <p className="text-muted text-sm">{greeting},</p>
            <h1 className="font-display font-bold text-2xl">{firstName}</h1>
          </div>
          <StreakBadge streak={displayedStreak} compact />
        </div>

        {/* Desktop hero */}
        <section className="hidden lg:grid lg:grid-cols-[1.2fr_0.8fr] gap-6 mb-6">
          <div className="card p-8 relative overflow-hidden">
            <p className="text-sm text-muted mb-2">{planLabel} · {profile.uiMode} view</p>
            <h1 className="font-display font-extrabold text-3xl xl:text-4xl leading-tight mb-3 max-w-xl">
              Every set you log rewrites{" "}
              <span className="text-signal">tomorrow&apos;s</span> workout.
            </h1>
            <p className="text-muted text-sm max-w-md mb-6">
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
              <p className="font-display font-bold text-lg mb-1">Session done for today</p>
              <p className="text-sm text-muted">Come back tomorrow to keep your streak and advance the program.</p>
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
            { title: "Swap equipment", body: "Same pattern, what you have today.", tone: "bg-deload/10 text-deload" },
          ].map((f) => (
            <div key={f.title} className="card p-5 flex gap-4 items-start">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${f.tone}`}>
                <span className="text-lg leading-none">•</span>
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{f.body}</p>
              </div>
            </div>
          ))}
        </section>

        {program.isDeloadWeek && program.deloadReason && !alreadyTrainedToday && (
          <div className="border border-deload/40 bg-deload/10 rounded-2xl px-4 py-3 mb-6 text-sm text-deload">
            {program.deloadReason}
          </div>
        )}

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
            <h3 className="font-display font-semibold text-base mb-4">
              {alreadyTrainedToday ? "Tomorrow's prescription" : "Today's prescription"}
            </h3>
            <div className="flex flex-col divide-y divide-border">
              {nextSession.exercises.map((ex) => {
                const def = findExercise(ex.exerciseId);
                return (
                  <div key={ex.exerciseId} className="py-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{def?.name ?? ex.exerciseId}</span>
                    <span className="data-readout text-sm text-muted whitespace-nowrap">
                      {ex.sets} × {ex.reps}
                      {ex.targetWeightKg > 0 ? ` @ ${displayWeight(ex.targetWeightKg)}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-display font-semibold text-base mb-4">This week</h3>
            <div className="flex flex-col divide-y divide-border">
              {program.weeklyTemplate.map((day, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between text-sm gap-2">
                  <span className={i === program.currentDayIndex ? "text-ink font-medium" : "text-muted"}>
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
