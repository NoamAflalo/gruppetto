import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

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

// Auth admin — the source of truth for user emails (profiles no longer store
// them, so they can't be harvested by other signed-in users).
export function getAdminAuth() {
  getAdminDb();
  return getAuth();
}
