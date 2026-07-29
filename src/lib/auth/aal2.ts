/**
 * Mobile AAL2 step-up helpers (Supabase MFA TOTP).
 * Mirrors Owner web patterns: listFactors + challenge + verify + re-read AAL.
 * Never logs TOTP codes, factor secrets, or session tokens.
 */

import { DomainError } from '@/lib/errors';
import { requireSupabase } from '@/lib/supabase';

export type AalLevel = 'aal1' | 'aal2';

export type Aal2Status = {
  currentLevel: AalLevel;
  nextLevel: AalLevel;
  hasVerifiedFactor: boolean;
  verifiedFactorId: string | null;
  enrollmentRequired: boolean;
};

export type Aal2VerifyResult =
  | { ok: true; currentLevel: AalLevel }
  | {
      ok: false;
      code:
        | 'invalid_code'
        | 'expired_challenge'
        | 'enrollment_required'
        | 'session'
        | 'network'
        | 'unknown';
      message: string;
    };

function asLevel(value: string | null | undefined): AalLevel {
  return value === 'aal2' ? 'aal2' : 'aal1';
}

/** True when an error indicates Owner/RPC AAL2 gate (fail-closed). */
export function isAal2RequiredError(error: unknown): boolean {
  if (error instanceof DomainError) {
    if (error.message.includes('AAL2_REQUIRED')) return true;
    if (error.code === 'FORBIDDEN' && String(error.details?.rpcCode ?? '').includes('AAL2')) {
      return true;
    }
  }
  if (error instanceof Error && error.message.includes('AAL2_REQUIRED')) return true;
  return false;
}

export async function getAal2Status(): Promise<Aal2Status> {
  const supabase = requireSupabase();
  const { data: aalData, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError) {
    throw DomainError.unauthorized('Session required for AAL check', { cause: aalError });
  }

  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) {
    throw new DomainError('NETWORK', 'Could not load MFA factors', { cause: factorsError });
  }

  const verified = factorsData?.totp ?? [];
  const verifiedFactorId = verified[0]?.id ?? null;
  const currentLevel = asLevel(aalData?.currentLevel);
  const nextLevel = asLevel(aalData?.nextLevel);

  return {
    currentLevel,
    nextLevel,
    hasVerifiedFactor: Boolean(verifiedFactorId),
    verifiedFactorId,
    enrollmentRequired: !verifiedFactorId && currentLevel !== 'aal2',
  };
}

export function normalizeTotpCode(raw: string): string {
  return raw.replace(/\s+/g, '').trim();
}

export function isValidTotpCodeFormat(raw: string): boolean {
  return /^\d{6}$/.test(normalizeTotpCode(raw));
}

/**
 * Challenge + verify an enrolled TOTP factor, then refresh AAL.
 * Does not enroll new factors — enrollment is Owner/web until Mobile enroll ships.
 */
export async function challengeAndVerifyTotp(code: string): Promise<Aal2VerifyResult> {
  const normalized = normalizeTotpCode(code);
  if (!isValidTotpCodeFormat(normalized)) {
    return {
      ok: false,
      code: 'invalid_code',
      message: 'Enter the 6-digit authenticator code.',
    };
  }

  const supabase = requireSupabase();
  const status = await getAal2Status();
  if (status.currentLevel === 'aal2') {
    return { ok: true, currentLevel: 'aal2' };
  }
  if (!status.verifiedFactorId) {
    return {
      ok: false,
      code: 'enrollment_required',
      message: 'MFA is not enrolled for this account.',
    };
  }

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: status.verifiedFactorId,
  });
  if (challengeError || !challenge?.id) {
    const msg = (challengeError?.message ?? '').toLowerCase();
    const expired = msg.includes('expired') || msg.includes('timeout');
    return {
      ok: false,
      code: expired ? 'expired_challenge' : 'network',
      message: expired
        ? 'The verification challenge expired. Try again.'
        : 'Could not start MFA verification. Try again.',
    };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: status.verifiedFactorId,
    challengeId: challenge.id,
    code: normalized,
  });
  if (verifyError) {
    const msg = (verifyError.message ?? '').toLowerCase();
    const expired = msg.includes('expired') || msg.includes('timeout');
    return {
      ok: false,
      code: expired ? 'expired_challenge' : 'invalid_code',
      message: expired
        ? 'The verification challenge expired. Try again.'
        : 'That code is incorrect or expired. Try again.',
    };
  }

  // Force session refresh so JWT AAL claim updates before sensitive RPCs.
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    return {
      ok: false,
      code: 'session',
      message: 'Verification succeeded but session refresh failed. Sign out and in again.',
    };
  }

  const after = await getAal2Status();
  if (after.currentLevel !== 'aal2') {
    return {
      ok: false,
      code: 'session',
      message: 'Still at AAL1 after verification. Sign out and in again.',
    };
  }
  return { ok: true, currentLevel: 'aal2' };
}

/**
 * Run a sensitive action only at AAL2.
 * - cancel / enrollment → no mutation
 * - success → action runs at most once after step-up
 * - server AAL2_REQUIRED after verify → fail closed (no auto-repeat loop)
 */
export async function runSensitiveActionWithAal2<T>(input: {
  action: () => Promise<T>;
  ensureStepUp: (status: Aal2Status) => Promise<'verified' | 'cancelled' | 'enrollment_required'>;
}): Promise<
  | { status: 'ok'; value: T }
  | { status: 'cancelled' }
  | { status: 'enrollment_required' }
  | { status: 'error'; error: unknown }
> {
  try {
    let status = await getAal2Status();
    if (status.currentLevel !== 'aal2') {
      if (status.enrollmentRequired) {
        return { status: 'enrollment_required' };
      }
      const step = await input.ensureStepUp(status);
      if (step === 'cancelled') return { status: 'cancelled' };
      if (step === 'enrollment_required') return { status: 'enrollment_required' };
      status = await getAal2Status();
      if (status.currentLevel !== 'aal2') {
        return { status: 'cancelled' };
      }
    }

    try {
      const value = await input.action();
      return { status: 'ok', value };
    } catch (error) {
      if (!isAal2RequiredError(error)) {
        return { status: 'error', error };
      }
      // Race: JWT not yet AAL2 — one interactive step-up, then one resume only.
      const again = await getAal2Status();
      if (again.enrollmentRequired) return { status: 'enrollment_required' };
      const step = await input.ensureStepUp(again);
      if (step !== 'verified') {
        return step === 'enrollment_required'
          ? { status: 'enrollment_required' }
          : { status: 'cancelled' };
      }
      const confirmed = await getAal2Status();
      if (confirmed.currentLevel !== 'aal2') return { status: 'cancelled' };
      const value = await input.action();
      return { status: 'ok', value };
    }
  } catch (error) {
    return { status: 'error', error };
  }
}
