// Lightweight, dependency-free assertion helpers for the streak logic.
// Run with: npx tsx lib/streaks.test.ts

import { effectiveStreak, localDateKey, previousLocalDateKey, updateStreakOnSession, hasCompletedSessionToday } from "./streaks";

let passed = 0;
let failed = 0;
function assert(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}`, detail ?? "");
    failed++;
  }
}

function eq(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Helper: pick a fixed local date for testing.
function at(y: number, m: number, d: number, h = 12): Date {
  return new Date(y, m - 1, d, h, 0, 0);
}

console.log("localDateKey / previousLocalDateKey");
{
  const d = at(2025, 3, 15);
  assert("mid-month", localDateKey(d) === "2025-03-15");
  assert("month boundary back", previousLocalDateKey("2025-03-01") === "2025-02-28");
  assert("month boundary forward", previousLocalDateKey("2025-01-01") === "2024-12-31");
  assert("leap year", previousLocalDateKey("2024-03-01") === "2024-02-29");
  assert("non-leap Feb", previousLocalDateKey("2025-03-01") === "2025-02-28");
}

console.log("updateStreakOnSession");
{
  const t = at(2025, 6, 10);
  // First session ever
  const r1 = updateStreakOnSession(undefined, t);
  assert("first session → 1", eq(r1, { streak: 1, lastStreakDay: "2025-06-10", changed: true }));

  // Same day again
  const r2 = updateStreakOnSession(r1, t);
  assert("same day → no change", eq(r2, { streak: 1, lastStreakDay: "2025-06-10", changed: false }));

  // Next day
  const r3 = updateStreakOnSession(r2, at(2025, 6, 11));
  assert("next day → 2", eq(r3, { streak: 2, lastStreakDay: "2025-06-11", changed: true }));

  // Skip a day, then come back
  const r4 = updateStreakOnSession(r3, at(2025, 6, 12));
  assert("day 3 → 3", eq(r4, { streak: 3, lastStreakDay: "2025-06-12", changed: true }));

  // Skipped 6/13, logged 6/14 → reset to 1
  const r5 = updateStreakOnSession(r4, at(2025, 6, 14));
  assert("missed a day → reset to 1", eq(r5, { streak: 1, lastStreakDay: "2025-06-14", changed: true }));

  // No prior session (first ever on a new device)
  const r6 = updateStreakOnSession({ streak: 0, lastStreakDay: undefined }, at(2025, 6, 14));
  assert("blank state → 1", eq(r6, { streak: 1, lastStreakDay: "2025-06-14", changed: true }));
}

console.log("effectiveStreak");
{
  const today = at(2025, 6, 10);
  assert("no history → 0", effectiveStreak(undefined, today) === 0);
  assert("lastStreakDay today → current", effectiveStreak({ streak: 5, lastStreakDay: "2025-06-10" }, today) === 5);
  assert("lastStreakDay yesterday → current", effectiveStreak({ streak: 5, lastStreakDay: "2025-06-09" }, today) === 5);
  assert("missed a day → 0", effectiveStreak({ streak: 5, lastStreakDay: "2025-06-08" }, today) === 0);
  assert("missed many days → 0", effectiveStreak({ streak: 100, lastStreakDay: "2025-01-01" }, today) === 0);
}

console.log("hasCompletedSessionToday");
{
  const today = at(2025, 6, 10);
  assert("no history → false", hasCompletedSessionToday(undefined, today) === false);
  assert("today → true", hasCompletedSessionToday({ lastStreakDay: "2025-06-10" }, today) === true);
  assert("yesterday → false", hasCompletedSessionToday({ lastStreakDay: "2025-06-09" }, today) === false);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
