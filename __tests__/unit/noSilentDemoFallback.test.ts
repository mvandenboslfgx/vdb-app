import { __testables } from '@/config/env';

describe('no silent demo fallback — resolveDemoMode', () => {
  it('never resolves to demo/mock data when Supabase is missing but demo was not explicitly requested', () => {
    for (const appEnv of ['development', 'test', 'preview', 'production'] as const) {
      if (appEnv === 'preview' || appEnv === 'production') {
        // Missing Supabase without demo hard-fails outright in these envs.
        expect(() =>
          __testables.resolveDemoMode({ appEnv, enableDemoMode: false, hasSupabaseConfig: false }),
        ).toThrow();
        continue;
      }
      const result = __testables.resolveDemoMode({
        appEnv,
        enableDemoMode: false,
        hasSupabaseConfig: false,
      });
      expect(result.useMockData).toBe(false);
    }
  });
});

describe('no silent demo fallback — repository adapter', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('resolves the supabase adapter (never demo) when the flag is off, even without a client', () => {
    jest.doMock('@/config/env', () => ({
      clientEnv: { useMockData: false, hasSupabaseConfig: false },
    }));
    jest.doMock('@/lib/supabase', () => ({ getSupabase: () => null }));

    const { DomainError } = require('@/lib/errors');
    const {
      getRepositoryAdapter,
      shouldUseMockApi,
      requireLiveSupabase,
    } = require('@/api/repositories/_utils');

    expect(getRepositoryAdapter()).toBe('supabase');
    expect(shouldUseMockApi()).toBe(false);
    expect(() => requireLiveSupabase()).toThrow(DomainError);
    expect(() => requireLiveSupabase()).toThrow(/not configured/i);
  });

  it('only selects the demo adapter when useMockData is explicitly true', () => {
    jest.doMock('@/config/env', () => ({
      clientEnv: { useMockData: true, hasSupabaseConfig: false },
    }));
    jest.doMock('@/lib/supabase', () => ({ getSupabase: () => null }));

    const { DomainError } = require('@/lib/errors');
    const {
      getRepositoryAdapter,
      shouldUseMockApi,
      requireLiveSupabase,
    } = require('@/api/repositories/_utils');

    expect(getRepositoryAdapter()).toBe('demo');
    expect(shouldUseMockApi()).toBe(true);
    // Even demo mode must not let requireLiveSupabase() silently succeed.
    expect(() => requireLiveSupabase()).toThrow(DomainError);
  });

  it('requireLiveSupabase returns the real client only when the supabase adapter is configured', () => {
    const fakeClient = { from: jest.fn() };
    jest.doMock('@/config/env', () => ({
      clientEnv: { useMockData: false, hasSupabaseConfig: true },
    }));
    jest.doMock('@/lib/supabase', () => ({ getSupabase: () => fakeClient }));

    const { requireLiveSupabase } = require('@/api/repositories/_utils');

    expect(requireLiveSupabase()).toBe(fakeClient);
  });
});

describe('no silent demo fallback — query errors never return mock data', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('propagates a Supabase query error as a DomainError instead of falling back to mockStore', async () => {
    jest.doMock('@/config/env', () => ({
      clientEnv: { useMockData: false, hasSupabaseConfig: true },
    }));

    const queryError = { message: 'permission denied for table commissions', code: '42501' };
    const orderMock = jest.fn().mockResolvedValue({ data: null, error: queryError });
    const selectMock = jest.fn().mockReturnValue({ order: orderMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    const fakeClient = { from: fromMock };
    jest.doMock('@/lib/supabase', () => ({ getSupabase: () => fakeClient }));

    const { DomainError } = require('@/lib/errors');
    const { listCommissions } = require('@/api/repositories/commissionsRepository');

    await expect(listCommissions()).rejects.toBeInstanceOf(DomainError);
    await expect(listCommissions()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(fromMock).toHaveBeenCalledWith('partner_commissions');
  });

  it('never returns mockStore data for a repository when the supabase adapter is active', async () => {
    jest.doMock('@/config/env', () => ({
      clientEnv: { useMockData: false, hasSupabaseConfig: true },
    }));

    const maybeSingleMock = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    const fakeClient = { from: fromMock };
    jest.doMock('@/lib/supabase', () => ({ getSupabase: () => fakeClient }));

    const { getCommission } = require('@/api/repositories/commissionsRepository');

    const result = await getCommission('com-001');
    // A real "not found" is `null`, never a fabricated mockStore commission.
    expect(result).toBeNull();
    expect(fromMock).toHaveBeenCalledWith('partner_commissions');
  });
});
