import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Server-side Firestore access (bypasses security rules). Requires
// FIREBASE_SERVICE_ACCOUNT_KEY = the service-account JSON from the Firebase
// console, as a single line.
export function getAdminDb() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY is not set. Create a service account key in the Firebase console (Project settings → Service accounts) and paste the JSON into this env var.'
      );
    }
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getFirestore();
}

// Emails live in Firebase Auth only (profiles no longer store them, so they
// can't be harvested by other signed-in users). We look them up through the
// Identity Toolkit REST API — firebase-admin/auth doesn't load on Vercel's
// serverless runtime (CJS/ESM conflict in its dependency chain).
export async function getUserEmails(uids) {
  if (!uids || uids.length === 0) return [];
  getAdminDb();
  const { access_token } = await getApp().options.credential.getAccessToken();
  const projectId = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY).project_id;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ localId: uids.slice(0, 100) }),
    }
  );
  if (!res.ok) {
    throw new Error(`accounts:lookup failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.users || []).map((u) => u.email).filter(Boolean);
}
