import { clientEnv, isDevelopment } from '@/config/env';

const SECRET_PATTERNS: readonly RegExp[] = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /(password|passwd|pwd|secret|token|api[_-]?key|authorization)\s*[:=]\s*["']?[^"'\s]+/gi,
  /EXPO_PUBLIC_SUPABASE_ANON_KEY\s*[:=]\s*\S+/gi,
];

export function scrubSecrets(input: string): string {
  let result = input;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

export function scrubError(error: unknown): string {
  if (error instanceof Error) {
    return scrubSecrets(`${error.name}: ${error.message}`);
  }
  if (typeof error === 'string') {
    return scrubSecrets(error);
  }
  try {
    return scrubSecrets(JSON.stringify(error));
  } catch {
    return '[unserializable_error]';
  }
}

let initialized = false;

/**
 * Sentry init stub. No-ops when DSN is missing so local / demo builds stay quiet.
 * Wire `@sentry/react-native` when a real DSN is present.
 */
export function initObservability(): void {
  if (initialized) {
    return;
  }
  initialized = true;

  const dsn = clientEnv.sentryDsn?.trim();
  if (!dsn) {
    if (isDevelopment) {
      console.info('[observability] Sentry disabled (no DSN)');
    }
    return;
  }

  // Lazy require keeps demo builds working if native Sentry is not linked yet.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native') as {
      init: (options: Record<string, unknown>) => void;
    };
    Sentry.init({
      dsn,
      environment: clientEnv.appEnv,
      tracesSampleRate: isDevelopment ? 1.0 : 0.15,
      beforeSend(event: { message?: string; exception?: { values?: { value?: string }[] } }) {
        if (event.message) {
          event.message = scrubSecrets(event.message);
        }
        const values = event.exception?.values;
        if (values) {
          for (const value of values) {
            if (value.value) {
              value.value = scrubSecrets(value.value);
            }
          }
        }
        return event;
      },
    });
  } catch {
    if (isDevelopment) {
      console.warn('[observability] Sentry package unavailable; continuing without it');
    }
  }
}

export function captureException(error: unknown, context?: Record<string, string>): void {
  const message = scrubError(error);
  if (!clientEnv.sentryDsn) {
    if (isDevelopment) {
      console.warn('[observability]', message, context);
    }
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native') as {
      captureException: (err: unknown, hint?: { extra?: Record<string, string> }) => void;
    };
    Sentry.captureException(error instanceof Error ? error : new Error(message), {
      extra: context,
    });
  } catch {
    // no-op
  }
}
