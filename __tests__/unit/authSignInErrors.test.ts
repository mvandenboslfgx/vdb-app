import {
  classifyBootstrapError,
  classifySupabaseAuthError,
  isSignInErrorKey,
} from '@/lib/auth/signInErrors';
import { resolveSignInErrorMessage } from '@/lib/auth/resolveSignInErrorMessage';
import { syncControlledFieldValue } from '@/lib/auth/syncControlledFieldValue';

describe('signInErrors', () => {
  it('classifies invalid credentials from Supabase', () => {
    expect(classifySupabaseAuthError(new Error('Invalid login credentials'))).toBe(
      'errors.auth.invalidCredentials',
    );
  });

  it('classifies network failures', () => {
    expect(classifySupabaseAuthError(new TypeError('fetch failed'))).toBe('errors.auth.network');
  });

  it('classifies email confirmation required', () => {
    expect(classifySupabaseAuthError(new Error('Email not confirmed'))).toBe(
      'errors.auth.emailNotConfirmed',
    );
  });

  it('maps bootstrap failures away from invalid password', () => {
    expect(classifyBootstrapError(new Error('profile missing for user'))).toBe(
      'errors.auth.profileMissing',
    );
    expect(classifyBootstrapError(new Error('timeout'))).toBe('errors.auth.network');
    expect(classifyBootstrapError(new Error('unexpected'))).toBe('errors.auth.bootstrapFailed');
  });

  it('recognizes sign-in error keys', () => {
    expect(isSignInErrorKey('errors.auth.bootstrapFailed')).toBe(true);
    expect(isSignInErrorKey('errors.auth.invalidCredentials')).toBe(true);
    expect(isSignInErrorKey('errors.generic')).toBe(false);
  });
});

describe('resolveSignInErrorMessage', () => {
  const t = ((key: string) => key) as never;

  it('returns bootstrap message for bootstrap errors', () => {
    expect(resolveSignInErrorMessage(new Error('errors.auth.bootstrapFailed'), t)).toBe(
      'auth.bootstrapFailed',
    );
  });

  it('defaults unknown errors to bootstrapFailed copy', () => {
    expect(resolveSignInErrorMessage(new Error('boom'), t)).toBe('auth.bootstrapFailed');
  });
});

describe('syncControlledFieldValue', () => {
  it('prefers native text when present', () => {
    expect(syncControlledFieldValue('old', 'new')).toBe('new');
  });

  it('falls back to current state and never returns undefined', () => {
    expect(syncControlledFieldValue('kept', undefined)).toBe('kept');
    expect(syncControlledFieldValue('', null)).toBe('');
  });
});
