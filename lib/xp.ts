export interface XpState {
  xp: number;
  level: number;
  lastWeeklyBonusWeek?: string;
}

export interface XpAwardResult extends XpState {
  leveledUp: boolean;
  newLevel: number;
}

const BASE_XP_PER_WORKOUT = 50;
const WEEKLY_BONUS_XP = 70;
const XP_PER_LEVEL = 100;

export function getWeekKey(date: Date): string {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  return `${start.getFullYear()}-W${String(getWeekNumber(start)).padStart(2, "0")}`;
}

function getWeekNumber(date: Date): number {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDay.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
}

export function getXpRequiredForLevel(level: number): number {
  return level * XP_PER_LEVEL;
}

export function getLevelFromXp(xp: number): number {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

export function getWeeklyBonusXp(): number {
  return WEEKLY_BONUS_XP;
}

export function awardXp(state: XpState, amount: number): XpAwardResult {
  const nextXp = Math.max(0, state.xp + amount);
  const nextLevel = getLevelFromXp(nextXp);
  return {
    xp: nextXp,
    level: nextLevel,
    lastWeeklyBonusWeek: state.lastWeeklyBonusWeek,
    leveledUp: nextLevel > state.level,
    newLevel: nextLevel,
  };
}

export function awardWorkoutXp(state: XpState): XpAwardResult {
  return awardXp(state, BASE_XP_PER_WORKOUT);
}

export function awardWeeklyBonus(state: XpState, weekKey: string): XpAwardResult {
  if (state.lastWeeklyBonusWeek === weekKey) {
    return { ...state, leveledUp: false, newLevel: state.level };
  }
  const result = awardXp(state, WEEKLY_BONUS_XP);
  return { ...result, lastWeeklyBonusWeek: weekKey };
}
