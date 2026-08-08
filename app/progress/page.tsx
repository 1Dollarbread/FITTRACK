"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { UserProfile, ProgramState } from "@/lib/types";
import AppShell from "@/components/AppShell";
import LoadMeter from "@/components/LoadMeter";
import StreakBadge from "@/components/StreakBadge";
import { effectiveStreak } from "@/lib/streaks";

export default function ProgressPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [program, setProgram] = useState<ProgramState | null>(null);

  useEffect(() => {
    let unsubProgram: (() => void) | null = null;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      getDoc(doc(db, "users", user.uid)).then((s) => {
        if (s.exists()) setProfile(s.data() as UserProfile);
      });
      unsubProgram = onSnapshot(doc(db, "users", user.uid, "programState", "current"), (s) => {
        if (s.exists()) setProgram(s.data() as ProgramState);
      });
    });
    return () => {
      unsub();
      unsubProgram?.();
    };
  }, [router]);

  if (!profile || !program) {
    return (
      <AppShell title="Progress">
        <main className="min-h-[50vh] flex items-center justify-center text-muted text-sm">
          Loading progress...
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell title="Progress">
      <main className="px-4 sm:px-6 lg:px-10 py-6 max-w-2xl mx-auto w-full space-y-4">
        <h1 className="font-display font-bold text-2xl mb-2">Progress</h1>
        <div className="card p-5">
          <StreakBadge streak={effectiveStreak(profile, new Date())} />
        </div>
        <div className="card p-5">
          <LoadMeter
            lastVolumeLoad={program.lastVolumeLoad}
            trailingVolumeLoad={program.trailingVolumeLoad}
            isDeloadWeek={program.isDeloadWeek}
            mode={profile.uiMode}
            title={`Week ${program.weekNumber}`}
          />
        </div>
        {program.isDeloadWeek && program.deloadReason && (
          <div className="border border-deload/40 bg-deload/10 rounded-2xl px-4 py-3 text-sm text-deload">
            {program.deloadReason}
          </div>
        )}
      </main>
    </AppShell>
  );
}
