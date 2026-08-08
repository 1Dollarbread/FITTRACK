export type WeightUnit = "kg" | "lb";

const KG_TO_LB = 2.20462262185;

export function toDisplayValue(kg: number, unit: WeightUnit): number {
  const value = unit === "lb" ? kg * KG_TO_LB : kg;
  return Math.ceil(value);
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${toDisplayValue(kg, unit)}${unit}`;
}
