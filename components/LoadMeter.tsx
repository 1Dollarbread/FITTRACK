"use client";

interface LoadMeterProps {
  lastVolumeLoad: number;
  trailingVolumeLoad: number;
  isDeloadWeek: boolean;
  mode: "beginner" | "advanced";
  title?: string;
}

export default function LoadMeter({
  lastVolumeLoad,
  trailingVolumeLoad,
  isDeloadWeek,
  mode,
  title = "Volume",
}: LoadMeterProps) {
  const ratio = trailingVolumeLoad > 0 ? lastVolumeLoad / trailingVolumeLoad : 1;
  const pct = Math.min(Math.max(ratio, 0), 1.5) / 1.5;
  const circumference = 2 * Math.PI * 54;
  const dash = circumference * pct;
  const color = isDeloadWeek ? "var(--color-deload)" : "var(--color-signal)";
  const deltaPct = trailingVolumeLoad > 0 ? Math.round((ratio - 1) * 100) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-base">{title}</h3>
        {deltaPct != null && (
          <span
            className={`text-xs font-semibold data-readout px-2 py-1 rounded-full ${
              deltaPct >= 0 ? "bg-success/15 text-success" : "bg-deload/15 text-deload"
            }`}
          >
            {deltaPct >= 0 ? "+" : ""}
            {deltaPct}%
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--color-surface2)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            transform="rotate(-90 60 60)"
          />
          <text
            x="60"
            y="56"
            textAnchor="middle"
            className="data-readout"
            fill="var(--color-ink)"
            fontSize="18"
            fontWeight="600"
          >
            {Math.round(lastVolumeLoad).toLocaleString()}
          </text>
          <text x="60" y="74" textAnchor="middle" fill="var(--color-muted)" fontSize="10">
            kg total
          </text>
        </svg>
        <div>
          <p className="text-sm text-muted">
            {isDeloadWeek ? "Deload week" : "Vs. trailing average"}
          </p>
          <p className="data-readout text-2xl font-semibold text-ink mt-1">
            {deltaPct != null ? `${deltaPct >= 0 ? "+" : ""}${deltaPct}%` : "—"}
          </p>
          {mode === "advanced" && (
            <p className="text-xs text-muted mt-1 data-readout">
              avg {Math.round(trailingVolumeLoad).toLocaleString()} kg
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
