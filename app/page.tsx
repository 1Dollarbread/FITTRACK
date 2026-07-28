import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";

const HERO_IMG =
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-base">
      <nav className="flex items-center justify-between px-6 md:px-10 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div className="leading-tight hidden sm:block">
            <p className="font-display font-bold text-xs tracking-[0.14em] uppercase">Progressive</p>
            <p className="font-display font-bold text-xs tracking-[0.14em] uppercase text-muted">
              Overload
            </p>
          </div>
        </div>
        <div className="flex gap-3 items-center text-sm">
          <ThemeToggle compact />
          <Link href="/pricing" className="text-muted hover:text-ink transition-colors hidden sm:inline">
            Pricing
          </Link>
          <Link href="/login" className="text-muted hover:text-ink transition-colors">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary">
            Start free
          </Link>
        </div>
      </nav>

      <section className="px-6 md:px-10 pt-10 pb-16 max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="font-display font-extrabold text-4xl md:text-5xl leading-[1.05] mb-5">
            Every set you log rewrites{" "}
            <span className="text-signal">tomorrow&apos;s</span> workout.
          </h1>
          <p className="text-ink text-base md:text-lg max-w-xl mb-8">
            Tell it your goals, equipment, and maxes once. The Progressive Overload Engine adjusts
            weight, reps, and rest from what you actually reported — not a fixed spreadsheet.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary !px-6 !py-3">
              Start a session
            </Link>
            <Link href="/pricing" className="btn-secondary !px-6 !py-3">
              See plans
            </Link>
          </div>
        </div>
        <div className="relative card overflow-hidden min-h-[280px] shadow-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HERO_IMG} alt="Gym training setup" className="absolute inset-0 w-full h-full object-cover" />
        </div>
      </section>

      <section className="px-6 md:px-10 pb-20 max-w-6xl mx-auto grid md:grid-cols-3 gap-4">
        {[
          {
            title: "Log by voice, hands-free",
            body: 'Between sets, say what you did — "bench press 135 for 8" — and it\'s logged.',
            tone: "bg-signal/10 text-signal",
          },
          {
            title: "Auto-deload before you burn out",
            body: "When volume ramps too fast or progress stalls, it inserts a lighter week automatically.",
            tone: "bg-success/10 text-success",
          },
          {
            title: "No equipment, no problem",
            body: "Only have dumbbells today? Tap Swap — same movement pattern, recalculated instantly.",
            tone: "bg-deload/10 text-deload",
          },
        ].map((f) => (
          <div key={f.title} className="card p-6 border border-border bg-surface text-ink">
            <div className={`w-10 h-10 rounded-full mb-4 flex items-center justify-center ${f.tone}`}>
              <span className="font-bold">•</span>
            </div>
            <h3 className="font-display font-semibold text-base mb-2 text-ink">{f.title}</h3>
            <p className="text-ink text-sm leading-relaxed">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
