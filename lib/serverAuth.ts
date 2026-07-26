// Server-side authentication for API routes.
// Verifies the Firebase ID token sent in the Authorization: Bearer <token> header.
//
// Setup:
//   1. In the Firebase console, generate a service account JSON (Project settings
//      → Service accounts → Generate new private key).
//   2. Set FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 in .env.local to
//      base64-encoded JSON (avoids dotenv mangling private_key newlines).
//      Do NOT commit it.

import { cert, getApp, getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";

let _app: App | null = null;
let _warnedUnverified = false;

function loadServiceAccountJson(): string {
  // Prefer base64 — dotenv mangles literal \n inside JSON private keys.
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64?.trim();
  if (b64) {
    return Buffer.from(b64, "base64").toString("utf8");
  }
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) return json;
  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 (or FIREBASE_SERVICE_ACCOUNT_JSON) is not configured."
  );
}

function getAdminApp(): App {
  if (_app) return _app;
  const serviceAccount = JSON.parse(loadServiceAccountJson()) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };
  // Private keys in env vars often have literal \n sequences that need converting.
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

  _app = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key,
        }),
      });
  return _app;
}

/** Decode a JWT payload without verifying the signature (dev fallback only). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf8"
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export interface VerifiedAuth {
  uid: string;
  email?: string;
}

export async function verifyRequestAuth(req: Request): Promise<VerifiedAuth> {
  const header = req.headers.get("authorization") || "";
  const bearer = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  if (!bearer) {
    throw new HttpError(401, "Missing Authorization: Bearer <token> header");
  }

  const hasServiceAccount = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64?.trim() ||
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  );
  if (!hasServiceAccount) {
    if (!_warnedUnverified) {
      console.warn(
        "[serverAuth] No Firebase service account env set — accepting unverified ID tokens. Set FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 for production."
      );
      _warnedUnverified = true;
    }
    const payload = decodeJwtPayload(bearer);
    const uid =
      (typeof payload?.user_id === "string" && payload.user_id) ||
      (typeof payload?.sub === "string" && payload.sub) ||
      "";
    if (!uid) {
      throw new HttpError(401, "Invalid ID token payload");
    }
    return {
      uid,
      email: typeof payload?.email === "string" ? payload.email : undefined,
    };
  }

  let decoded: { uid: string; email?: string };
  try {
    const app = getAdminApp();
    decoded = await getAdminAuth(app).verifyIdToken(bearer, /* checkRevoked */ true);
  } catch (err) {
    throw new HttpError(
      401,
      `Invalid or expired ID token: ${err instanceof Error ? err.message : "unknown error"}`
    );
  }
  return { uid: decoded.uid, email: decoded.email };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function httpErrorToResponse(err: unknown): Response {
  if (err instanceof HttpError) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: err.status,
      headers: { "Content-Type": "application/json" },
    });
  }
  console.error("Unexpected server error:", err);
  return new Response(JSON.stringify({ error: "Internal server error" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}
