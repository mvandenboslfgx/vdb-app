/**
 * Auth sign-in error taxonomy for mobile login.
 * UI maps these keys to user-safe copy; logs retain technical detail separately.
 */

export const SIGN_IN_ERROR_KEYS = [
  'errors.auth.invalidCredentials',
  'errors.auth.network',
  'errors.auth.emailNotConfirmed',
  'errors.auth.disabled',
  'errors.auth.bootstrapFailed',
  'errors.auth.profileMissing',
  'errors.auth.unsupportedRole',
  'errors.auth.mfaRequired',
] as const;

export type SignInErrorKey = (typeof SIGN_IN_ERROR_KEYS)[number];

export function isSignInErrorKey(value: string): value is SignInErrorKey {
  return (SIGN_IN_ERROR_KEYS as readonly string[]).includes(value);
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message).toLowerCase();
  }
  return String(error ?? '').toLowerCase();
}

/** Classify Supabase Auth API errors from signInWithPassword. */
export function classifySupabaseAuthError(error: unknown): SignInErrorKey {
  const message = messageOf(error);

  if (
    message.includes('invalid credentials') ||
    message.includes('invalid login') ||
    message.includes('invalid email or password')
  ) {
    return 'errors.auth.invalidCredentials';
  }

  if (
    message.includes('email not confirmed') ||
    message.includes('email_not_confirmed')
  ) {
    return 'errors.auth.emailNotConfirmed';
  }

  if (
    message.includes('user is banned') ||
    message.includes('user banned') ||
    message.includes('disabled') ||
    message.includes('not authorized')
  ) {
    return 'errors.auth.disabled';
  }

  if (
    message.includes('mfa') ||
    message.includes('totp') ||
    message.includes('factor') ||
    message.includes('aal2')
  ) {
    return 'errors.auth.mfaRequired';
  }

  if (
    error instanceof TypeError ||
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('failed to connect') ||
    message.includes('connection') ||
    message.includes('timeout')
  ) {
    return 'errors.auth.network';
  }

  return 'errors.auth.invalidCredentials';
}

/** Map internal bootstrap failures — never present as wrong password. */
export function classifyBootstrapError(error: unknown): SignInErrorKey {
  const message = messageOf(error);

  if (message.includes('unsupported role') || message.includes('unsupported_role')) {
    return 'errors.auth.unsupportedRole';
  }

  if (message.includes('profile') && message.includes('missing')) {
    return 'errors.auth.profileMissing';
  }

  if (
    error instanceof TypeError ||
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('failed to connect') ||
    message.includes('connection') ||
    message.includes('timeout')
  ) {
    return 'errors.auth.network';
  }

  return 'errors.auth.bootstrapFailed';
}
