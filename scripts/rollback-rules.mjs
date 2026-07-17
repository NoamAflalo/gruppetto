// Restores a previous Firestore ruleset. Usage:
//   node scripts/rollback-rules.mjs projects/workout-9ed5f/rulesets/<id>
import fs from 'fs';
import { GoogleAuth } from 'google-auth-library';

const target = process.argv[2];
if (!target) throw new Error('usage: node scripts/rollback-rules.mjs <rulesetName>');

const env = fs.readFileSync('.env.local', 'utf8');
const raw = env.match(/^FIREBASE_SERVICE_ACCOUNT_KEY='(.*)'$/m)?.[1];
const auth = new GoogleAuth({
  credentials: JSON.parse(raw),
  scopes: ['https://www.googleapis.com/auth/firebase'],
});
const client = await auth.getClient();
const base = 'https://firebaserules.googleapis.com/v1/projects/workout-9ed5f';

const rel = await client.request({ url: `${base}/releases` });
const fsRelease = rel.data.releases.find((r) => r.name.includes('cloud.firestore'));

await client.request({
  url: `https://firebaserules.googleapis.com/v1/${fsRelease.name}`,
  method: 'PATCH',
  data: { release: { name: fsRelease.name, rulesetName: target } },
});
console.log('✓ Rolled back to', target);
