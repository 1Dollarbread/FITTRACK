export default function BrandMark({ small = false }: { small?: boolean }) {
  const size = small ? "w-8 h-8" : "w-10 h-10";
  return (
    <div
      className={`${size} rounded-xl bg-signal text-white flex items-center justify-center shadow-soft shrink-0`}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className={small ? "w-4 h-4" : "w-5 h-5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M7 7l10 10M17 7L7 17" strokeLinecap="round" />
      </svg>
    </div>
  );
}
