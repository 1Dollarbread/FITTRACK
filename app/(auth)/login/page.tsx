"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, type AuthError } from "firebase/auth";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";

function friendlyAuthError(err: unknown): string {
  if (typeof err === "object" && err && "code" in err) {
    const code = (err as AuthError).code ?? "";
    if (code === "auth/invalid-email") return "That email address doesn't look right.";
    if (code === "auth/user-disabled") return "This account has been disabled.";
    if (
      code === "auth/user-not-found" ||
      code === "auth/wrong-password" ||
      code === "auth/invalid-credential"
    )
      return "Email or password is incorrect.";
    if (code === "auth/too-many-requests")
      return "Too many attempts. Try again in a few minutes.";
    if (code === "auth/network-request-failed")
      return "Network error — check your connection and try again.";
  }
  return "Couldn't sign in. Please try again.";
}

export default function LoginPage() {
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
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
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
          <h1 className="font-display font-bold text-2xl mb-6">Log in</h1>
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
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field mb-3"
            required
            autoComplete="current-password"
          />
          {error && (
            <p className="text-deload text-xs mb-3" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="w-full btn-primary !py-3">
            {loading ? "Signing in..." : "Log in"}
          </button>
          <p className="text-muted text-sm mt-6 text-center">
            No account?{" "}
            <Link href="/signup" className="text-signal font-medium">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
