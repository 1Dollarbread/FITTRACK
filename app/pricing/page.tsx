"use client";

import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";

// Stripe Checkout is not wired up yet. Replace the href when ready.
const STRIPE_CHECKOUT_LINK_PLACEHOLDER = "#";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-base">
      <nav className="flex items-center justify-between px-6 md:px-10 py-5 max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark small />
          <span className="font-display font-bold text-sm">Progressive Overload</span>
        </Link>
        <ThemeToggle compact />
      </nav>

      <div className="px-6 md:px-10 py-10 max-w-4xl mx-auto">
        <h1 className="font-display font-bold text-3xl mb-2">Plans</h1>
        <p className="text-muted mb-10">Start free. Upgrade when you want the full engine.</p>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="card p-8">
            <h2 className="font-display font-semibold text-xl mb-1">Free</h2>
            <p className="data-readout text-3xl font-bold mb-6">$0</p>
            <ul className="text-sm text-muted flex flex-col gap-2 mb-8">
              <li>Full onboarding + generated program</li>
              <li>Manual + voice logging</li>
              <li>Progressive overload engine</li>
              <li>Auto-deload detection</li>
            </ul>
            <Link href="/signup" className="btn-secondary w-full">
              Get started
            </Link>
          </div>

          <div className="card p-8 border-signal shadow-soft">
            <h2 className="font-display font-semibold text-xl mb-1">Premium</h2>
            <p className="data-readout text-3xl font-bold mb-6">
              $9<span className="text-sm text-muted font-normal">/mo</span>
            </p>
            <ul className="text-sm text-muted flex flex-col gap-2 mb-8">
              <li>Everything in Free</li>
              <li>AI camera form feedback (coming soon)</li>
              <li>Advanced velocity + volume analytics</li>
              <li>Priority micro-goal coaching</li>
            </ul>
            <a href={STRIPE_CHECKOUT_LINK_PLACEHOLDER} className="btn-primary w-full">
              Upgrade — checkout coming soon
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
