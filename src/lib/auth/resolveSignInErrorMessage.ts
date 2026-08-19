import type { TFunction } from 'i18next';

import { isSignInErrorKey, type SignInErrorKey } from '@/lib/auth/signInErrors';

/** Resolve a sign-in error key to localized, user-safe copy. */
export function resolveSignInErrorMessage(
  error: unknown,
  t: TFunction<'errors'>,
): string {
  const key =
    error instanceof Error && isSignInErrorKey(error.message)
      ? (error.message as SignInErrorKey)
      : 'errors.auth.bootstrapFailed';

  switch (key) {
    case 'errors.auth.network':
      return t('auth.network');
    case 'errors.auth.emailNotConfirmed':
      return t('auth.emailNotConfirmed');
    case 'errors.auth.disabled':
      return t('auth.disabled');
    case 'errors.auth.bootstrapFailed':
      return t('auth.bootstrapFailed');
    case 'errors.auth.profileMissing':
      return t('auth.profileMissing');
    case 'errors.auth.unsupportedRole':
      return t('auth.unsupportedRole');
    case 'errors.auth.mfaRequired':
      return t('auth.mfaRequired');
    case 'errors.auth.invalidCredentials':
    default:
      return t('auth.invalidCredentials');
  }
}
