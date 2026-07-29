import { DomainError } from '@/lib/errors';

const mockGetAal = jest.fn();
const mockChallengeVerify = jest.fn();

jest.mock('@/lib/supabase', () => ({
  requireSupabase: () => ({
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: (...args: unknown[]) => mockGetAal('aal', ...args),
        listFactors: (...args: unknown[]) => mockGetAal('factors', ...args),
        challenge: jest.fn(),
        verify: jest.fn(),
      },
      refreshSession: jest.fn(async () => ({ error: null })),
    },
  }),
}));

import {
  isAal2RequiredError,
  isValidTotpCodeFormat,
  normalizeTotpCode,
  runSensitiveActionWithAal2,
} from '@/lib/auth/aal2';

describe('aal2 step-up helpers', () => {
  beforeEach(() => {
    mockGetAal.mockReset();
    mockChallengeVerify.mockReset();
  });

  it('normalizes and validates TOTP format', () => {
    expect(normalizeTotpCode('12 34 56')).toBe('123456');
    expect(isValidTotpCodeFormat('123456')).toBe(true);
    expect(isValidTotpCodeFormat('12345')).toBe(false);
  });

  it('detects AAL2_REQUIRED', () => {
    expect(isAal2RequiredError(DomainError.forbidden('AAL2_REQUIRED:step_up'))).toBe(true);
    expect(isAal2RequiredError(DomainError.validation('nope'))).toBe(false);
  });

  it('AAL1 → step-up cancel keeps action unrun (fail-closed)', async () => {
    mockGetAal.mockImplementation(async (kind: string) => {
      if (kind === 'aal') return { data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null };
      return { data: { totp: [{ id: 'factor-1' }], all: [] }, error: null };
    });
    let calls = 0;
    const result = await runSensitiveActionWithAal2({
      action: async () => {
        calls += 1;
        return 'mutated';
      },
      ensureStepUp: async () => 'cancelled',
    });
    expect(result).toEqual({ status: 'cancelled' });
    expect(calls).toBe(0);
  });

  it('missing enrollment does not invent enroll flow', async () => {
    mockGetAal.mockImplementation(async (kind: string) => {
      if (kind === 'aal') return { data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null };
      return { data: { totp: [], all: [] }, error: null };
    });
    let calls = 0;
    const result = await runSensitiveActionWithAal2({
      action: async () => {
        calls += 1;
        return 'mutated';
      },
      ensureStepUp: async () => 'verified',
    });
    expect(result).toEqual({ status: 'enrollment_required' });
    expect(calls).toBe(0);
  });

  it('successful AAL2 resumes original action once', async () => {
    let aalCalls = 0;
    mockGetAal.mockImplementation(async (kind: string) => {
      if (kind === 'aal') {
        aalCalls += 1;
        // First probe aal1, after step-up aal2
        const level = aalCalls === 1 ? 'aal1' : 'aal2';
        return { data: { currentLevel: level, nextLevel: 'aal2' }, error: null };
      }
      return { data: { totp: [{ id: 'factor-1' }], all: [] }, error: null };
    });
    let calls = 0;
    const result = await runSensitiveActionWithAal2({
      action: async () => {
        calls += 1;
        return 'done';
      },
      ensureStepUp: async () => 'verified',
    });
    expect(result).toEqual({ status: 'ok', value: 'done' });
    expect(calls).toBe(1);
  });

  it('prevents double mutation when first attempt already succeeded', async () => {
    mockGetAal.mockImplementation(async (kind: string) => {
      if (kind === 'aal') return { data: { currentLevel: 'aal2', nextLevel: 'aal2' }, error: null };
      return { data: { totp: [{ id: 'factor-1' }], all: [] }, error: null };
    });
    let calls = 0;
    const result = await runSensitiveActionWithAal2({
      action: async () => {
        calls += 1;
        return 'once';
      },
      ensureStepUp: async () => 'verified',
    });
    expect(result.status).toBe('ok');
    expect(calls).toBe(1);
  });
});
