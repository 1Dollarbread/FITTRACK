"use client";

import { useState } from "react";

interface EffortInputProps {
  mode: "beginner" | "advanced";
  onChange: (value: { effortRating?: "easy" | "medium" | "hard"; rpe?: number }) => void;
}

export default function EffortInput({ mode, onChange }: EffortInputProps) {
  const [rpe, setRpe] = useState(7);
  const [effort, setEffort] = useState<"easy" | "medium" | "hard" | null>(null);

  if (mode === "beginner") {
    const options: { key: "easy" | "medium" | "hard"; label: string }[] = [
      { key: "easy", label: "Easy" },
      { key: "medium", label: "Medium" },
      { key: "hard", label: "Hard" },
    ];
    return (
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => {
              setEffort(opt.key);
              onChange({ effortRating: opt.key });
            }}
            className={`flex-1 rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
              effort === opt.key
                ? "border-signal bg-signal/10 text-signal-bright"
                : "border-border text-muted hover:border-signal-dim"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm text-muted">Reported effort (RPE)</label>
        <span className="data-readout text-signal-bright text-lg">{rpe}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={0.5}
        value={rpe}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          setRpe(v);
          onChange({ rpe: v });
        }}
        className="w-full accent-signal"
      />
      <div className="flex justify-between text-xs text-muted mt-1 data-readout">
        <span>1 — very light</span>
        <span>10 — max effort</span>
      </div>
    </div>
  );
}
