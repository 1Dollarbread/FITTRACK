// Client-side helper to call the protected /api/* routes.
// Attaches the current user's Firebase ID token (refreshed if close to expiry).
// Throws on non-2xx responses so the caller can surface the error.

import { auth } from "./firebase";

async function authHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("You're signed out. Please log in again.");
  }
  // Force-refresh so the token is valid for the call.
  const token = await user.getIdToken(/* forceRefresh */ false);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = (await res.json()) as { error?: string };
      detail = j.error ? `: ${j.error}` : "";
    } catch {
      // ignore
    }
    throw new Error(`Request failed (${res.status})${detail}`);
  }
  return (await res.json()) as T;
}
