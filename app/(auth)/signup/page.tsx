"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, type AuthError } from "firebase/auth";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";

function friendlyAuthError(err: unknown): string {
  if (typeof err === "object" && err && "code" in err) {
    const code = (err as AuthError).code ?? "";
    if (code === "auth/email-already-in-use")
      return "An account with that email already exists. Try logging in.";
    if (code === "auth/invalid-email") return "That email address doesn't look right.";
    if (code === "auth/weak-password")
      return "Password is too weak — use at least 8 characters.";
    if (code === "auth/operation-not-allowed")
      return "Sign-up is currently disabled. Contact support.";
    if (code === "auth/network-request-failed")
      return "Network error — check your connection and try again.";
  }
  return "Couldn't create an account. Please try again.";
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push("/onboarding");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark small />
          <span className="font-display font-bold text-sm">Progressive Overload</span>
        </Link>
        <ThemeToggle compact />
      </div>
      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <form onSubmit={handleSubmit} className="w-full max-w-sm card p-8">
          <h1 className="font-display font-bold text-2xl mb-6">Create your account</h1>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field mb-3"
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field mb-3"
            required
            minLength={8}
            autoComplete="new-password"
          />
          {error && (
            <p className="text-deload text-xs mb-3" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="w-full btn-primary !py-3">
            {loading ? "Creating account..." : "Continue to onboarding"}
          </button>
          <p className="text-muted text-sm mt-6 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-signal font-medium">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
