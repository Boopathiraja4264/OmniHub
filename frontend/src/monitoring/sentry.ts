import * as Sentry from '@sentry/react';

/**
 * Initialise Sentry.
 * Set REACT_APP_SENTRY_DSN in your .env (local) and Vercel env vars (production).
 * If DSN is empty, Sentry is a no-op — safe to leave unset locally.
 */
export function initSentry() {
  const dsn = process.env.REACT_APP_SENTRY_DSN;
  if (!dsn) return; // disabled when DSN not set

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    // Capture 20% of transactions for performance monitoring (free tier friendly)
    tracesSampleRate: 0.2,
    // Only send errors in production
    enabled: process.env.NODE_ENV === 'production',
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
  });
}

export { Sentry };
