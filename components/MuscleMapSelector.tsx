"use client";

import { useState } from "react";
import { MuscleGroup } from "@/lib/types";
import { MUSCLE_GROUP_LABELS } from "@/lib/exercises";

interface MuscleMapSelectorProps {
  selected: MuscleGroup[];
  onToggle: (muscle: MuscleGroup) => void;
}

const ACTIVE_FILL = "var(--color-signal)";
const INACTIVE_FILL = "var(--color-surface2)";
const HOVER_FILL = "var(--color-signal-dim)";
const HEAD_FILL = "var(--color-muted)";
const STROKE = "var(--color-border)";

function regionFill(muscle: MuscleGroup, selected: MuscleGroup[], hovered: MuscleGroup | null) {
  if (selected.includes(muscle)) return ACTIVE_FILL;
  if (hovered === muscle) return HOVER_FILL;
  return INACTIVE_FILL;
}

export default function MuscleMapSelector({ selected, onToggle }: MuscleMapSelectorProps) {
  const [view, setView] = useState<"front" | "back">("front");
  const [hovered, setHovered] = useState<MuscleGroup | null>(null);

  const regionProps = (muscle: MuscleGroup) => ({
    fill: regionFill(muscle, selected, hovered),
    stroke: STROKE,
    strokeWidth: 1.5,
    className: "cursor-pointer transition-colors duration-150",
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle(muscle);
    },
    onMouseEnter: () => setHovered(muscle),
    onMouseLeave: () => setHovered(null),
    role: "button" as const,
    tabIndex: 0,
    "aria-label": MUSCLE_GROUP_LABELS[muscle],
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle(muscle);
      }
    },
  });

  return (
    <div>
      <div className="flex justify-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setView("front")}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            view === "front" ? "bg-signal text-white" : "bg-surface2 text-muted"
          }`}
        >
          Front
        </button>
        <button
          type="button"
          onClick={() => setView("back")}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            view === "back" ? "bg-signal text-white" : "bg-surface2 text-muted"
          }`}
        >
          Back
        </button>
      </div>

      <div className="flex justify-center">
        <svg width="220" height="380" viewBox="0 0 220 380">
          {/* Head + neck, non-interactive, for orientation only */}
          <circle cx="110" cy="30" r="22" fill={HEAD_FILL} />
          <rect x="98" y="48" width="24" height="16" fill={HEAD_FILL} />

          {view === "front" ? (
            <>
              {/* Shoulders */}
              <path d="M60 66 Q40 66 38 100 L58 108 Q64 78 78 68 Z" {...regionProps("shoulders")} />
              <path d="M160 66 Q180 66 182 100 L162 108 Q156 78 142 68 Z" {...regionProps("shoulders")} />
              {/* Chest */}
              <path d="M78 68 Q110 60 142 68 L138 130 Q110 140 82 130 Z" {...regionProps("chest")} />
              {/* Biceps */}
              <rect x="34" y="108" width="24" height="60" rx="8" {...regionProps("biceps")} />
              <rect x="162" y="108" width="24" height="60" rx="8" {...regionProps("biceps")} />
              {/* Forearms */}
              <rect x="30" y="170" width="20" height="55" rx="8" {...regionProps("forearms")} />
              <rect x="170" y="170" width="20" height="55" rx="8" {...regionProps("forearms")} />
              {/* Core */}
              <rect x="86" y="132" width="48" height="60" rx="6" {...regionProps("core")} />
              {/* Quads */}
              <rect x="78" y="196" width="30" height="90" rx="8" {...regionProps("quads")} />
              <rect x="112" y="196" width="30" height="90" rx="8" {...regionProps("quads")} />
              {/* Calves */}
              <rect x="80" y="290" width="24" height="70" rx="8" {...regionProps("calves")} />
              <rect x="116" y="290" width="24" height="70" rx="8" {...regionProps("calves")} />
            </>
          ) : (
            <>
              {/* Shoulders (rear delts) — drawn first so traps/back sit on top for clicks */}
              <path d="M60 66 Q40 66 38 100 L58 108 Q64 78 78 68 Z" {...regionProps("shoulders")} />
              <path d="M160 66 Q180 66 182 100 L162 108 Q156 78 142 68 Z" {...regionProps("shoulders")} />
              {/* Lats / mid-back — lower torso only so it doesn't cover traps */}
              <path d="M78 92 L142 92 L134 138 Q110 148 86 138 Z" {...regionProps("back")} />
              {/* Traps — upper back diamond; drawn last among torso regions so it stays clickable */}
              <path
                d="M98 52 L122 52 L138 78 L110 96 L82 78 Z"
                {...regionProps("traps")}
              />
              {/* Triceps */}
              <rect x="34" y="108" width="24" height="60" rx="8" {...regionProps("triceps")} />
              <rect x="162" y="108" width="24" height="60" rx="8" {...regionProps("triceps")} />
              {/* Forearms */}
              <rect x="30" y="170" width="20" height="55" rx="8" {...regionProps("forearms")} />
              <rect x="170" y="170" width="20" height="55" rx="8" {...regionProps("forearms")} />
              {/* Glutes — starts below lat region to avoid stealing back/trap clicks */}
              <rect x="82" y="150" width="56" height="36" rx="10" {...regionProps("glutes")} />
              {/* Hamstrings */}
              <rect x="78" y="188" width="30" height="84" rx="8" {...regionProps("hamstrings")} />
              <rect x="112" y="188" width="30" height="84" rx="8" {...regionProps("hamstrings")} />
              {/* Calves */}
              <rect x="80" y="278" width="24" height="70" rx="8" {...regionProps("calves")} />
              <rect x="116" y="278" width="24" height="70" rx="8" {...regionProps("calves")} />
            </>
          )}
        </svg>
      </div>

      {/* Chip list also acts as a fallback selector when SVG hit-targets are unclear */}
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {(
          [
            "chest",
            "back",
            "traps",
            "shoulders",
            "biceps",
            "triceps",
            "quads",
            "hamstrings",
            "glutes",
            "calves",
            "core",
            "forearms",
          ] as MuscleGroup[]
        ).map((m) => {
          const isOn = selected.includes(m);
          return (
            <button
              key={m}
              type="button"
              onClick={() => onToggle(m)}
              className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                isOn
                  ? "bg-signal/10 border-signal-dim text-signal-bright"
                  : "bg-surface2 border-border text-muted hover:border-signal-dim hover:text-ink"
              }`}
            >
              {MUSCLE_GROUP_LABELS[m]}
            </button>
          );
        })}
      </div>
      {selected.length === 0 && (
        <p className="text-xs text-muted text-center mt-3">
          Tap muscle groups above to add extra emphasis — or skip for a balanced default.
        </p>
      )}
    </div>
  );
}
