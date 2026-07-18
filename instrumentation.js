import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN } from '@/lib/sentry';

// Server + edge runtime Sentry init. Active in production only.
export async function register() {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === 'production',
  });
}

export const onRequestError = Sentry.captureRequestError;
