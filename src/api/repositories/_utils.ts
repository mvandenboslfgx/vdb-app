import { clientEnv } from '@/config/env';
import { DomainError } from '@/lib/errors';
import { getSupabase, type TypedSupabaseClient } from '@/lib/supabase';

export type RepositoryAdapter = 'demo' | 'supabase';

/**
 * The single source of truth for which backend a repository must use.
 * Demo is ONLY selected when the developer explicitly enabled it — see
 * `resolveDemoMode` in `@/config/env`. There is no implicit/silent branch.
 */
export function getRepositoryAdapter(): RepositoryAdapter {
  return clientEnv.useMockData ? 'demo' : 'supabase';
}

/** True only when the demo adapter is active. Never true due to a missing/misconfigured client. */
export function shouldUseMockApi(): boolean {
  return getRepositoryAdapter() === 'demo';
}

/**
 * Asserts the supabase adapter is active AND a client instance exists, returning it.
 * Throws a `DomainError('CONFIGURATION', …)` otherwise — repositories must
 * propagate this, never fall back to mock data.
 */
export function requireLiveSupabase(): TypedSupabaseClient {
  if (getRepositoryAdapter() !== 'supabase') {
    throw DomainError.configuration(
      'requireLiveSupabase() called while the demo adapter is active.',
    );
  }
  const supabase = getSupabase();
  if (!supabase) {
    throw DomainError.configuration(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, or enable demo mode only in development.',
    );
  }
  return supabase;
}

export function delay(ms = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
