// Deploys firestore.rules to production and prints the previous ruleset id
// for rollback. Usage: node scripts/deploy-rules.mjs
import fs from 'fs';
import { GoogleAuth } from 'google-auth-library';

const env = fs.readFileSync('.env.local', 'utf8');
const raw = env.match(/^FIREBASE_SERVICE_ACCOUNT_KEY='(.*)'$/m)?.[1];
if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');

const auth = new GoogleAuth({
  credentials: JSON.parse(raw),
  scopes: ['https://www.googleapis.com/auth/firebase'],
});
const client = await auth.getClient();
const base = 'https://firebaserules.googleapis.com/v1/projects/workout-9ed5f';

const rel = await client.request({ url: `${base}/releases` });
const fsRelease = rel.data.releases.find((r) => r.name.includes('cloud.firestore'));
console.log('Previous ruleset (rollback id):', fsRelease.rulesetName);

const source = fs.readFileSync('firestore.rules', 'utf8');
const created = await client.request({
  url: `${base}/rulesets`,
  method: 'POST',
  data: { source: { files: [{ name: 'firestore.rules', content: source }] } },
});
console.log('New ruleset:', created.data.name);

await client.request({
  url: `https://firebaserules.googleapis.com/v1/${fsRelease.name}`,
  method: 'PATCH',
  data: { release: { name: fsRelease.name, rulesetName: created.data.name } },
});
console.log('✓ Rules released to production');
console.log('Rollback: node scripts/rollback-rules.mjs', fsRelease.rulesetName);
