'use client';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// Last-resort error page (replaces the root layout when it crashes).
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  console.error('Global error:', error);

  return (
    <html lang="en">
      <body style={{ background: '#0C0B09', color: '#F2EFE9', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>Something broke.</h1>
          <p style={{ color: '#A39E93', marginBottom: '1.5rem' }}>Sorry — try reloading the page.</p>
          <button
            onClick={reset}
            style={{ background: '#F97316', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
