// Server-side helpers for API routes: Firebase ID token verification + rate limiting.

/**
 * Verifies a Firebase ID token sent as "Authorization: Bearer <token>".
 * Uses Firebase's accounts:lookup REST endpoint so we don't need firebase-admin
 * or a service account. Returns { uid, email } or null if invalid/missing.
 */
export async function verifyFirebaseToken(request) {
  const authHeader = request.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: match[1] }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const user = data.users?.[0];
    if (!user || user.disabled) return null;
    return { uid: user.localId, email: user.email };
  } catch {
    return null;
  }
}

// In-memory sliding-window rate limiter. On Vercel this is per serverless
// instance (resets on cold start), so treat it as burst protection, not a
// hard quota.
const buckets = new Map();

export function rateLimit(key, { limit = 20, windowMs = 60 * 60 * 1000 } = {}) {
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  buckets.set(key, recent);
  return true;
}
