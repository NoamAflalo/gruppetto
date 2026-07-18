// Sentry DSN. Not a secret — it's embedded in the client bundle by design and
// only allows sending events, not reading them. Overridable via env if needed.
export const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  'https://e741abdd85c7462d8ef658d2c3411da6@o4511758478606336.ingest.de.sentry.io/4511758482997328';
