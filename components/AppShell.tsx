"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import ThemeToggle from "./ThemeToggle";
import BrandMark from "./BrandMark";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: OverviewIcon },
  { href: "/log", label: "Sessions", icon: SessionsIcon },
  { href: "/exercises", label: "Exercises", icon: ExercisesIcon },
  { href: "/progress", label: "Progress", icon: ProgressIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

const MOBILE_NAV = [
  { href: "/dashboard", label: "Home", icon: OverviewIcon },
  { href: "/progress", label: "Sessions", icon: SessionsIcon },
  { href: "/log", label: "Add", icon: PlusIcon, primary: true },
  { href: "/exercises", label: "Exercises", icon: ExercisesIcon },
  { href: "/settings", label: "Profile", icon: ProfileIcon },
] as const;

export default function AppShell({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);

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

  const displayName = profile?.displayName?.trim() || "Athlete";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-base text-ink flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar sticky top-0 h-screen">
        <div className="px-5 py-6 flex items-center gap-3">
          <BrandMark />
          <div className="leading-tight">
            <p className="font-display font-bold text-[11px] tracking-[0.12em] uppercase text-ink">
              Progressive
            </p>
            <p className="font-display font-bold text-[11px] tracking-[0.12em] uppercase text-muted">
              Overload
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-signal/10 text-signal"
                    : "text-muted hover:text-ink hover:bg-surface2"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between gap-2">
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-signal text-white flex items-center justify-center font-display font-bold">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <button
                type="button"
                onClick={() => signOut(auth).then(() => router.push("/login"))}
                className="text-xs text-muted hover:text-signal"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col pb-24 lg:pb-0">
        <header className="lg:hidden sticky top-0 z-20 bg-surface/90 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark small />
            <span className="font-display font-bold text-sm tracking-tight">
              {title ?? "Progressive Overload"}
            </span>
          </div>
          <ThemeToggle compact />
        </header>
        <div className="flex-1">{children}</div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-surface/95 backdrop-blur px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="flex items-end justify-around max-w-lg mx-auto">
          {MOBILE_NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            if ("primary" in item && item.primary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="-mt-6 w-14 h-14 rounded-full bg-signal text-white shadow-soft flex items-center justify-center"
                  aria-label="Start session"
                >
                  <Icon className="w-7 h-7" />
                </Link>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-medium ${
                  active ? "text-signal" : "text-muted"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export { default as BrandMark } from "./BrandMark";

function OverviewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function SessionsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  );
}
function ExercisesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6.5 6.5h11v11h-11z" />
      <path d="M3 9v6M21 9v6M9 3h6M9 21h6" strokeLinecap="round" />
    </svg>
  );
}
function ProgressIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19V5M4 19h16" strokeLinecap="round" />
      <path d="M8 15l3-4 3 2 4-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
    </svg>
  );
}
function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" strokeLinecap="round" />
    </svg>
  );
}
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
