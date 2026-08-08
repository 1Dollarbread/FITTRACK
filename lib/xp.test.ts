import test from "node:test";
import assert from "node:assert/strict";
import { awardXp, getLevelFromXp, getWeeklyBonusXp, getXpRequiredForLevel, getWeekKey } from "./xp";

test("level rises after enough xp", () => {
  const result = awardXp({ xp: 90, level: 1 }, 20);
  assert.equal(result.level, 2);
  assert.equal(result.xp, 110);
  assert.equal(result.leveledUp, true);
});

test("weekly bonus is awarded for full-week completion", () => {
  const weekKey = getWeekKey(new Date(2026, 6, 28));
  const workoutResult = awardXp({ xp: 50, level: 1 }, 50);
  const result = awardXp(workoutResult, getWeeklyBonusXp());
  assert.equal(result.xp, 170);
  assert.equal(getLevelFromXp(199), 2);
  assert.equal(getXpRequiredForLevel(2), 200);
  assert.match(weekKey, /^2026-W/);
});
