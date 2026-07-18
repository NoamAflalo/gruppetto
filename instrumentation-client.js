import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN } from '@/lib/sentry';

// Browser Sentry init. Active in production only.
Sentry.init({
  dsn: SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === 'production',
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
