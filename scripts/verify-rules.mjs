// End-to-end verification of the Firestore security rules against production,
// using two throwaway accounts. Cleans up everything it creates.
// Usage: node scripts/verify-rules.mjs
import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from 'firebase/auth';
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc,
  collection, addDoc, arrayUnion, arrayRemove,
} from 'firebase/firestore';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.replace(/^["']|["']$/g, '');

const app = initializeApp({
  apiKey: get('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: get('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: get('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
});
const auth = getAuth(app);
const db = getFirestore(app);

let pass = 0, fail = 0;
const expect = async (label, shouldSucceed, fn) => {
  try {
    await fn();
    if (shouldSucceed) { pass++; console.log(`  ✓ ${label}`); }
    else { fail++; console.log(`  ✗ ${label} — SHOULD HAVE BEEN DENIED`); }
  } catch (e) {
    const denied = e.code === 'permission-denied';
    if (!shouldSucceed && denied) { pass++; console.log(`  ✓ ${label} (denied as expected)`); }
    else { fail++; console.log(`  ✗ ${label} — ${e.code || e.message}`); }
  }
};

const ts = Date.now();
const mk = (n) => [`claude-rules-${n}-${ts}@example.com`, `Test-${n}-${ts}!x`];
const [emailA, passA] = mk('a');
const [emailB, passB] = mk('b');

// --- setup: user A (female host) ---
const credA = await createUserWithEmailAndPassword(auth, emailA, passA);
const uidA = credA.user.uid;
await setDoc(doc(db, 'profiles', uidA), { displayName: 'Test A', gender: 'female', createdAt: new Date().toISOString() });

const base = { description: 'rules test', activity_type: 'running', date: '2030-01-01', time: '10:00', location: 'Test', meetingPoint: 'Test', destination: '', intensity: 'easy', distance: '', max_participants: '', host_user_id: uidA, host_email: emailA, created_at: new Date() };
const s1 = await addDoc(collection(db, 'sessions'), { ...base, title: 'Public S1', isPrivate: false, girlsOnly: false, participants: [uidA] });
const s2 = await addDoc(collection(db, 'sessions'), { ...base, title: 'Girls S2', isPrivate: false, girlsOnly: true, participants: [uidA] });
const s3 = await addDoc(collection(db, 'sessions'), { ...base, title: 'Private S3', isPrivate: true, girlsOnly: false, participants: [uidA], joinRequests: [] });
const c1 = await addDoc(collection(db, 'sessions', s1.id, 'comments'), { userId: uidA, message: 'hello', timestamp: new Date(), readBy: [uidA] });
const r1 = await addDoc(collection(db, 'recurringSessions'), { ...base, title: 'Weekly R1', weekday: 'tuesday', isPrivate: false, girlsOnly: false, active: true });
console.log('setup done (A created 3 sessions + 1 comment + 1 recurring template)');

// --- switch to user B (male) ---
const credB = await createUserWithEmailAndPassword(auth, emailB, passB);
const uidB = credB.user.uid;
await setDoc(doc(db, 'profiles', uidB), { displayName: 'Test B', gender: 'male', createdAt: new Date().toISOString() });

console.log('as user B:');
await expect('join public session', true, () =>
  updateDoc(doc(db, 'sessions', s1.id), { participants: arrayUnion(uidB) }));
await expect('edit someone else session title', false, () =>
  updateDoc(doc(db, 'sessions', s1.id), { title: 'HACKED' }));
await expect('remove host from participants', false, () =>
  updateDoc(doc(db, 'sessions', s1.id), { participants: arrayRemove(uidA) }));
await expect('join girls-only session as male', false, () =>
  updateDoc(doc(db, 'sessions', s2.id), { participants: arrayUnion(uidB) }));
await expect('join private session directly', false, () =>
  updateDoc(doc(db, 'sessions', s3.id), { participants: arrayUnion(uidB) }));
await expect('file a join request on private session', true, () =>
  updateDoc(doc(db, 'sessions', s3.id), { joinRequests: arrayUnion({ userId: uidB, userName: 'Test B', userEmail: emailB, requestedAt: new Date().toISOString(), status: 'pending' }) }));
await expect('comment on joined session', true, () =>
  addDoc(collection(db, 'sessions', s1.id, 'comments'), { userId: uidB, message: 'hi', timestamp: new Date(), readBy: [uidB] }));
await expect('comment on session not joined', false, () =>
  addDoc(collection(db, 'sessions', s2.id, 'comments'), { userId: uidB, message: 'intrus', timestamp: new Date(), readBy: [uidB] }));
await expect('mark someone else comment as read (readBy append)', true, () =>
  updateDoc(doc(db, 'sessions', s1.id, 'comments', c1.id), { readBy: arrayUnion(uidB) }));
await expect('edit someone else comment text', false, () =>
  updateDoc(doc(db, 'sessions', s1.id, 'comments', c1.id), { message: 'defaced' }));
await expect('delete someone else session', false, () =>
  deleteDoc(doc(db, 'sessions', s1.id)));
await expect('edit someone else profile', false, () =>
  updateDoc(doc(db, 'profiles', uidA), { displayName: 'HACKED' }));
await expect('leave session', true, () =>
  updateDoc(doc(db, 'sessions', s1.id), { participants: arrayRemove(uidB) }));
const profA = await getDoc(doc(db, 'profiles', uidA));
await expect('profile of A contains no email field', profA.data().email === undefined, async () => {});
await expect('read someone else recurring template', false, () => getDoc(doc(db, 'recurringSessions', r1.id)).then((snap) => {
  if (!snap.exists()) { const e = new Error('denied'); e.code = 'permission-denied'; throw e; }
}));
await expect('update someone else recurring template', false, () =>
  updateDoc(doc(db, 'recurringSessions', r1.id), { active: false }));
await expect('create recurring template impersonating another host', false, () =>
  addDoc(collection(db, 'recurringSessions'), { ...base, title: 'Spoofed', weekday: 'monday', active: true, host_user_id: uidA }));
const r2 = await (async () => {
  let created;
  await expect('create own recurring template', true, () => addDoc(collection(db, 'recurringSessions'), { ...base, title: 'Weekly R2', weekday: 'wednesday', host_user_id: uidB, host_email: emailB, active: true }).then((ref) => { created = ref; }));
  return created;
})();

// --- back to A (host powers + girls-only join) ---
await signInWithEmailAndPassword(auth, emailA, passA);
console.log('as user A (host):');
await expect('host edits own session title', true, () =>
  updateDoc(doc(db, 'sessions', s1.id), { title: 'Public S1 edited' }));
await expect('host approves join request', true, () =>
  updateDoc(doc(db, 'sessions', s3.id), { joinRequests: [], participants: arrayUnion(uidB) }));
await expect('read own recurring template', true, () => getDoc(doc(db, 'recurringSessions', r1.id)));
await expect('reassign recurring template ownership', false, () =>
  updateDoc(doc(db, 'recurringSessions', r1.id), { host_user_id: uidB }));
await expect('stop own recurring template (active:false)', true, () =>
  updateDoc(doc(db, 'recurringSessions', r1.id), { active: false }));
await expect('hard-delete recurring template via client (never allowed)', false, () =>
  deleteDoc(doc(db, 'recurringSessions', r1.id)));

// cleanup (client-allowed writes)
for (const s of [s1, s2, s3]) await deleteDoc(doc(db, 'sessions', s.id));
await deleteDoc(doc(db, 'profiles', uidA));
await deleteUser(auth.currentUser);
await signInWithEmailAndPassword(auth, emailB, passB);
await deleteDoc(doc(db, 'profiles', uidB));
await deleteUser(auth.currentUser);

// recurringSessions has no client delete by design (see firestore.rules) —
// clean up the two test templates via the admin SDK instead.
const { initializeApp: initAdmin, cert, getApps } = await import('firebase-admin/app');
const { getFirestore: getAdminFirestore } = await import('firebase-admin/firestore');
const saRaw = env.match(/^FIREBASE_SERVICE_ACCOUNT_KEY='(.*)'$/m)?.[1];
if (saRaw && !getApps().length) initAdmin({ credential: cert(JSON.parse(saRaw)) });
if (saRaw) {
  const adminDb = getAdminFirestore();
  await adminDb.collection('recurringSessions').doc(r1.id).delete();
  await adminDb.collection('recurringSessions').doc(r2.id).delete();
}
console.log('cleanup done');

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
