import fs from 'fs';
import { chromium } from 'playwright';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.replace(/^["']|["']$/g, '');
const saRaw = env.match(/^FIREBASE_SERVICE_ACCOUNT_KEY='(.*)'$/m)?.[1];
if (!getApps().length) initializeApp({ credential: cert(JSON.parse(saRaw)) });
const adminDb = getFirestore();

const BASE = 'https://www.getgruppetto.com';
const ts = Date.now();
const emailA = `claude-e2e2-a-${ts}@example.com`, passA = `Test-A-${ts}!x`;
const emailB = `claude-e2e2-b-${ts}@example.com`, passB = `Test-B-${ts}!x`;
const TITLE = `E2E Fixed Recurring ${ts}`;
const WEEKS = 3;

let ok = 0, bad = 0;
const check = (label, cond) => { if (cond) { ok++; console.log(`  ✓ ${label}`); } else { bad++; console.log(`  ✗ ${label}`); } };

const browser = await chromium.launch();

async function signUpAndLogin(page, email, pass) {
  await page.goto(`${BASE}/`, { timeout: 45000 });
  await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
  await page.getByPlaceholder('your-email@example.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(pass);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/browse', { timeout: 30000 });
}

console.log('--- setup: create host (A) ---');
const pageA = await (await browser.newContext()).newPage();
await signUpAndLogin(pageA, emailA, passA);
console.log('A signed up');

console.log(`--- A creates a ${WEEKS}-week recurring session via the real UI ---`);
await pageA.goto(`${BASE}/create`, { timeout: 30000 });
await pageA.getByPlaceholder('e.g., Morning 10K Run').fill(TITLE);
await pageA.getByPlaceholder('Tell people about your session...').fill('E2E test session, safe to ignore/delete.');
await pageA.getByText('Select date').click();
await pageA.locator('button:has-text("→")').first().click();
await pageA.getByRole('button', { name: '15', exact: true }).click();
await pageA.locator('input[name="time"]').fill('19:00');
await pageA.locator('select').first().selectOption('Battersea Park');

await pageA.getByLabel(/Make this a recurring session/).check();
const weeksInput = pageA.getByLabel('Repeat for how many weeks?');
await weeksInput.fill(String(WEEKS));
const preview = await pageA.getByText(/sessions total, every/).textContent();
console.log('  preview:', preview?.trim());
check('preview mentions the right count', preview?.includes(`${WEEKS} sessions total`));

await pageA.getByRole('button', { name: 'Create Session', exact: true }).click();
await pageA.waitForURL('**/browse', { timeout: 15000 });
console.log('submitted, redirected to /browse');

await new Promise((r) => setTimeout(r, 1500));
const snap = await adminDb.collection('sessions').where('title', '==', TITLE).get();
check(`exactly ${WEEKS} sessions created up front`, snap.size === WEEKS);

const docs = snap.docs.sort((a, b) => a.data().date.localeCompare(b.data().date));
const groupId = docs[0]?.data().recurringGroupId;
check('all occurrences share the same recurringGroupId', docs.every((d) => d.data().recurringGroupId === groupId) && !!groupId);
check('week indices are 1..N with correct total', docs.every((d, i) => d.data().recurringWeekIndex === i + 1 && d.data().recurringTotalWeeks === WEEKS));

const dates = docs.map((d) => d.data().date);
const expectedGapsOk = dates.every((d, i) => {
  if (i === 0) return true;
  const prev = new Date(dates[i - 1]);
  const cur = new Date(d);
  return (cur - prev) / 86400000 === 7;
});
check('occurrences are exactly 7 days apart', expectedGapsOk);

const recurringSessionsCount = (await adminDb.collection('recurringSessions').get()).size;
check('no recurringSessions template collection is used anymore', recurringSessionsCount === 0);

console.log('--- badge + week index check on the first occurrence ---');
const firstId = docs[0].id;
const midId = docs[1].id;
const lastId = docs[2].id;
await pageA.goto(`${BASE}/session/${firstId}`, { timeout: 30000 });
const badgeText = await pageA.getByText(/Repeats every/).first().textContent({ timeout: 15000 }).catch(() => null);
check('badge shows "Repeats every X" and week index', !!badgeText && badgeText.includes('Week 1/3'));
const stopButtonGone = await pageA.getByText('Stop repeating this session').count();
check('no "stop repeating the series" control exists anymore', stopButtonGone === 0);
const cancelVisible = await pageA.getByRole('button', { name: /Cancel Session/ }).waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
check('"Cancel Session" control visible to host', cancelVisible);

console.log('--- B joins the middle occurrence via the real UI ---');
const pageB = await (await browser.newContext()).newPage();
await signUpAndLogin(pageB, emailB, passB);
await pageB.goto(`${BASE}/session/${midId}`, { timeout: 30000 });
await pageB.getByRole('button', { name: 'Join Session' }).click();
const leaveVisible = await pageB.getByRole('button', { name: 'Leave Session' }).waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
check('B joined the middle occurrence', leaveVisible);

console.log('--- A cancels ONLY the middle occurrence via the real UI ---');
await pageA.goto(`${BASE}/session/${midId}`, { timeout: 30000 });
pageA.once('dialog', (dialog) => dialog.accept());
await pageA.getByRole('button', { name: /Cancel Session/ }).click();
await pageA.waitForURL('**/browse', { timeout: 15000 });
console.log('cancelled, redirected to /browse');

await new Promise((r) => setTimeout(r, 1500));
const midDoc = await adminDb.collection('sessions').doc(midId).get();
check('cancelled occurrence no longer exists', !midDoc.exists);
const midComments = await adminDb.collection('sessions').doc(midId).collection('comments').get();
check('cancelled occurrence comments were cleaned up too', midComments.size === 0);

const firstDoc = await adminDb.collection('sessions').doc(firstId).get();
const lastDoc = await adminDb.collection('sessions').doc(lastId).get();
check('first occurrence (week 1) untouched', firstDoc.exists && firstDoc.data().title === TITLE);
check('last occurrence (week 3) untouched', lastDoc.exists && lastDoc.data().title === TITLE);

console.log('--- cleanup ---');
await browser.close();
await adminDb.collection('sessions').doc(firstId).delete();
await adminDb.collection('sessions').doc(lastId).delete();

const API_KEY = get('NEXT_PUBLIC_FIREBASE_API_KEY');
for (const [email, pass] of [[emailA, passA], [emailB, passB]]) {
  const signIn = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
  }).then((r) => r.json());
  if (signIn.localId) await adminDb.collection('profiles').doc(signIn.localId).delete().catch(() => {});
  if (signIn.idToken) {
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: signIn.idToken }),
    });
  }
}
console.log('cleanup done');

console.log(`\nRESULT: ${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
