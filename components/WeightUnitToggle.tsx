"use client";

import { useWeightUnit } from "./WeightUnitProvider";

export default function WeightUnitToggle({ compact = false }: { compact?: boolean }) {
  const { unit, toggleUnit } = useWeightUnit();

  return (
    <button
      type="button"
      onClick={toggleUnit}
      aria-label={`Switch weight units to ${unit === "kg" ? "pounds" : "kilograms"}`}
      className={`inline-flex items-center gap-2 rounded-xl border border-border bg-surface2/80 hover:border-signal-dim transition-colors ${
        compact ? "p-2.5" : "px-3 py-2 text-sm"
      }`}
    >
      <span className="text-muted">{unit === "kg" ? "kg" : "lb"}</span>
      {!compact && <span className="text-ink font-medium">{unit === "kg" ? "Switch to lb" : "Switch to kg"}</span>}
    </button>
  );
}
