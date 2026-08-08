"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { UserProfile, UIMode } from "@/lib/types";
import AppShell from "@/components/AppShell";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";

export default function SettingsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setProfile(snap.data() as UserProfile);
    });
    return () => unsub();
  }, [router]);

  async function setUiMode(uiMode: UIMode) {
    if (!profile || !auth.currentUser) return;
    setSaving(true);
    const next = { ...profile, uiMode };
    await setDoc(doc(db, "users", auth.currentUser.uid), next);
    setProfile(next);
    setSaving(false);
  }

  return (
    <AppShell title="Settings">
      <main className="px-4 sm:px-6 lg:px-10 py-6 max-w-2xl mx-auto w-full space-y-4">
        <h1 className="font-display font-bold text-2xl mb-2">Settings</h1>

        <section className="card p-5">
          <h2 className="font-display font-semibold mb-1">Appearance</h2>
          <p className="text-sm text-muted mb-4">
            Currently using <span className="text-ink font-medium">{theme}</span> mode.
          </p>
          <ThemeToggle />
        </section>

        <section className="card p-5">
          <h2 className="font-display font-semibold mb-1">Training view</h2>
          <p className="text-sm text-muted mb-4">Switch between simple effort ratings and RPE.</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving || !profile}
              onClick={() => setUiMode("beginner")}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                profile?.uiMode === "beginner"
                  ? "border-signal bg-signal/10 text-signal"
                  : "border-border text-muted hover:border-signal-dim"
              }`}
            >
              Beginner
            </button>
            <button
              type="button"
              disabled={saving || !profile}
              onClick={() => setUiMode("advanced")}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                profile?.uiMode === "advanced"
                  ? "border-signal bg-signal/10 text-signal"
                  : "border-border text-muted hover:border-signal-dim"
              }`}
            >
              Advanced
            </button>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-display font-semibold mb-1">Account</h2>
          <p className="text-sm text-muted mb-4">{profile?.displayName ?? "Athlete"}</p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => signOut(auth).then(() => router.push("/login"))}
          >
            Sign out
          </button>
        </section>
      </main>
    </AppShell>
  );
}
