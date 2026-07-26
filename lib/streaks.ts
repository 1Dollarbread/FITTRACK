// Calendar-day training streak logic.
//
// Rule (as specified): a streak is extended once per calendar day (local
// timezone) when the user finishes a session. If the user goes a full
// calendar day without finishing a session, the streak resets to 0 and
// stays at 0 until the next completed session (which then sets it to 1).
//
// We persist two fields on UserProfile:
//   - streak:       the current count (0 when not set / reset)
//   - lastStreakDay: the local-timezone `YYYY-MM-DD` of the most recent
//                    session that extended the streak
//
// Why a date string and not a timestamp? Day comparison is trivial, and we
// avoid timezone drift between client and server by always deriving the
// date from the `now` argument the caller passes in (so the API route can
// use its own clock and the client can use its own — whichever is
// authoritative in that context).

import { UserProfile } from "./types";

/** Returns `YYYY-MM-DD` for the given Date in its local timezone. */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Subtracts one day from a `YYYY-MM-DD` string, returning a new `YYYY-MM-DD`.
 *  Uses Date math so month/year boundaries (incl. leap years) are handled. */
export function previousLocalDateKey(key: string): string {
  const [y, m, d] = key.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return localDateKey(dt);
}

export interface StreakUpdate {
  streak: number;
  lastStreakDay: string;
  /** True if the streak changed in any way (increment or first-set). */
  changed: boolean;
}

/**
 * Pure function: given the user's current profile (or just the streak fields)
 * and the moment a session was completed, returns the new streak values.
 * Does NOT mutate the input.
 */
export function updateStreakOnSession(
  current: { streak?: number; lastStreakDay?: string } | null | undefined,
  now: Date
): StreakUpdate {
  const today = localDateKey(now);
  const yesterday = previousLocalDateKey(today);

  if (!current?.lastStreakDay) {
    // First session ever.
    return { streak: 1, lastStreakDay: today, changed: true };
  }
  if (current.lastStreakDay === today) {
    // Already counted today — no change.
    return {
      streak: current.streak ?? 1,
      lastStreakDay: today,
      changed: false,
    };
  }
  if (current.lastStreakDay === yesterday) {
    // Continued the streak.
    return {
      streak: (current.streak ?? 0) + 1,
      lastStreakDay: today,
      changed: true,
    };
  }
  // Gap of >= 1 full day — reset and start fresh at 1.
  return { streak: 1, lastStreakDay: today, changed: true };
}

/**
 * Returns the *display* streak, applying the reset rule for missed days.
 * If a user opens the app two days after their last session, we want to
 * show 0 immediately rather than the stale number, even before their next
 * session. Called on every read of the profile.
 */
export function effectiveStreak(
  current: { streak?: number; lastStreakDay?: string } | null | undefined,
  now: Date
): number {
  if (!current?.lastStreakDay) return 0;
  const today = localDateKey(now);
  const yesterday = previousLocalDateKey(today);
  if (current.lastStreakDay === today) return current.streak ?? 0;
  if (current.lastStreakDay === yesterday) return current.streak ?? 0;
  // Missed a day (or more) — streak is gone until the next session.
  return 0;
}

/** True if the athlete already finished a session on this local calendar day. */
export function hasCompletedSessionToday(
  current: { lastStreakDay?: string } | null | undefined,
  now: Date = new Date()
): boolean {
  if (!current?.lastStreakDay) return false;
  return current.lastStreakDay === localDateKey(now);
}
