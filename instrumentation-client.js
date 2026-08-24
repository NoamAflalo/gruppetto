import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN } from '@/lib/sentry';

// Browser extensions inject scripts into the page, and when one of them throws,
// window.onerror reports it as if it were ours. The filename is no help: the
// Next.js SDK rewrites every frame's origin to `app:///`, so an extension's
// `chrome-extension://<id>/foo.js` arrives looking like `app:///foo.js`.
//
// Our own code is only ever served from /_next/, so an exception that carries
// stack frames but none from /_next/ did not originate in this app. Events with
// no frames at all (cross-origin "Script error.") are kept rather than guessed at.
function isFromThisApp(event) {
  const values = event.exception?.values;
  if (!values?.length) return true;

  const frames = values.flatMap((value) => value.stacktrace?.frames ?? []);
  if (!frames.length) return true;

  return frames.some((frame) => frame.filename?.includes('/_next/'));
}

// Browser Sentry init. Active in production only.
Sentry.init({
  dsn: SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === 'production',
  beforeSend(event) {
    return isFromThisApp(event) ? event : null;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
