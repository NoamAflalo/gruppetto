# Gruppetto (workout-buddy)

Social training-session app for London — find and join running, cycling and swimming sessions. Live at [getgruppetto.com](https://www.getgruppetto.com).

Next.js 16 (app router) · Firebase (Auth, Firestore, Storage) · Tailwind · Google Maps · Resend · Claude API.

## Development

```bash
npm install
npm run dev   # http://localhost:3000
```

## Environment variables (`.env.local`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` (6 vars) | Firebase web config for project `workout-9ed5f` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps JS API key (referrer-restricted) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics |
| `ANTHROPIC_API_KEY` | AI session generator (`/api/generate-session`, `claude-haiku-4-5`) |
| `RESEND_API_KEY` | Email notifications (`/api/send-notification`, reminder cron) |
| `EMAIL_FROM` | Sender address; defaults to Resend sandbox `onboarding@resend.dev` (sandbox only delivers to the Resend account owner) |
| `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` | Strava OAuth callback |
| `CRON_SECRET` | Protects `/api/cron/send-reminders`; Vercel Cron sends it automatically when set in Vercel env vars |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Service-account JSON (single line) used by the reminder cron to read Firestore server-side |

## API routes

All routes require a signed-in user: the client sends the Firebase ID token via `authedFetch` (`lib/api.js`) and the server verifies it (`lib/serverAuth.js`). Both routes are rate-limited per user.

- `POST /api/generate-session` — Claude generates a session (structured outputs guarantee valid JSON)
- `POST /api/send-notification` — transactional emails; templates live in `lib/emailTemplates.js` (HTML-escaped)
- `GET /api/cron/send-reminders` — daily Vercel cron (17:00 UTC, `vercel.json`); emails everyone in tomorrow's sessions, idempotent via `reminderSentAt` on the session doc
- `GET /api/strava/callback` — Strava OAuth exchange

## Production email setup (one-time)

1. Create an API key at [resend.com/api-keys](https://resend.com/api-keys) → set `RESEND_API_KEY` locally and in Vercel.
2. Verify `getgruppetto.com` under Resend → Domains (add the DNS records at your registrar), then set `EMAIL_FROM=Gruppetto <hello@getgruppetto.com>`. Until this is done, emails only deliver to the Resend account owner's address.
3. Firebase console → Project settings → Service accounts → Generate new private key → paste the JSON (one line) as `FIREBASE_SERVICE_ACCOUNT_KEY` in Vercel.
4. Add `CRON_SECRET` to Vercel env vars (any random string; already generated in `.env.local`).
