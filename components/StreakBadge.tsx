"use client";

interface StreakBadgeProps {
  streak: number;
  compact?: boolean;
}

export default function StreakBadge({ streak, compact = false }: StreakBadgeProps) {
  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-1.5 rounded-full bg-deload/15 text-deload px-2.5 py-1 text-xs font-semibold"
        title="Consecutive training days"
      >
        <FlameIcon className="w-3.5 h-3.5" />
        <span className="data-readout">{streak}</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3"
      title="Consecutive training days. Resets if a full calendar day is missed."
    >
      <div className="w-12 h-12 rounded-2xl bg-deload/15 text-deload flex items-center justify-center">
        <FlameIcon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs text-muted uppercase tracking-wide font-medium">Day streak</p>
        <p className="data-readout text-2xl font-bold text-ink leading-none mt-0.5">{streak}</p>
      </div>
    </div>
  );
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2s4 3.5 4 8a4 4 0 0 1-8 0c0-2 1-3.5 2-5 .5 2 2 3 2 3S13 5 12 2z" opacity="0.9" />
      <path d="M12 22a6 6 0 0 0 6-6c0-3-2-5.5-4-8-1 2.5-2 4-2 4s-1-1.5-2-4c-2 2.5-4 5-4 8a6 6 0 0 0 6 6z" />
    </svg>
  );
}
