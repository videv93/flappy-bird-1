// Error logging utility
// TODO: Replace with Sentry integration when ready
// npm install @sentry/nextjs

/**
 * Log an error for debugging purposes
 * Currently logs to console; will be replaced with Sentry.captureException
 */
export function logError(error: unknown, context?: Record<string, unknown>) {
  // TODO: Sentry.captureException(error, { extra: context });
  console.error('[Error]', error, context);
}

/**
 * Log a warning for debugging purposes
 * Currently logs to console; will be replaced with Sentry.captureMessage
 */
export function logWarning(message: string, context?: Record<string, unknown>) {
  // TODO: Sentry.captureMessage(message, { level: 'warning', extra: context });
  console.warn('[Warning]', message, context);
}
