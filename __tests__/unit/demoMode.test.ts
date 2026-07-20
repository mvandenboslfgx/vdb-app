import {
  __testables,
  ConfigurationError,
  resolveDemoMode,
} from '@/config/env';

describe('demo mode hardening', () => {
  it('allows demo only in development when explicitly enabled', () => {
    expect(
      resolveDemoMode({
        appEnv: 'development',
        enableDemoMode: true,
        hasSupabaseConfig: false,
      }),
    ).toEqual({ demoAllowed: true, useMockData: true });
  });

  it('does not use mock data in development when demo flag is false', () => {
    expect(
      resolveDemoMode({
        appEnv: 'development',
        enableDemoMode: false,
        hasSupabaseConfig: false,
      }),
    ).toEqual({ demoAllowed: false, useMockData: false });
  });

  it('never uses mock data when Supabase is configured even if demo enabled', () => {
    expect(
      resolveDemoMode({
        appEnv: 'development',
        enableDemoMode: true,
        hasSupabaseConfig: true,
      }),
    ).toEqual({ demoAllowed: true, useMockData: false });
  });

  it('hard-fails when demo is requested in preview', () => {
    expect(() =>
      resolveDemoMode({
        appEnv: 'preview',
        enableDemoMode: true,
        hasSupabaseConfig: true,
      }),
    ).toThrow(ConfigurationError);
  });

  it('hard-fails when demo is requested in production', () => {
    expect(() =>
      resolveDemoMode({
        appEnv: 'production',
        enableDemoMode: true,
        hasSupabaseConfig: true,
      }),
    ).toThrow(ConfigurationError);
  });

  it('hard-fails preview without Supabase (no silent demo fallback)', () => {
    expect(() =>
      resolveDemoMode({
        appEnv: 'preview',
        enableDemoMode: false,
        hasSupabaseConfig: false,
      }),
    ).toThrow(/Demo fallback is disabled|Missing EXPO_PUBLIC_SUPABASE/);
  });

  it('hard-fails production without Supabase', () => {
    expect(() =>
      resolveDemoMode({
        appEnv: 'production',
        enableDemoMode: false,
        hasSupabaseConfig: false,
      }),
    ).toThrow(ConfigurationError);
  });

  it('allows test env with explicit demo for automated tests', () => {
    expect(
      resolveDemoMode({
        appEnv: 'test',
        enableDemoMode: true,
        hasSupabaseConfig: false,
      }),
    ).toEqual({ demoAllowed: true, useMockData: true });
  });
});

describe('env testables', () => {
  it('exports placeholder constants for docs/tests', () => {
    expect(__testables.PLACEHOLDER_URL).toContain('placeholder');
  });
});
