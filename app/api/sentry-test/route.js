// Temporary endpoint to confirm Sentry captures server errors.
// Hit /api/sentry-test once, verify it lands in the Sentry dashboard, then delete.
export function GET() {
  throw new Error('Sentry test error — server route (safe to ignore)');
}
