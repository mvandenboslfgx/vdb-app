import { clientEnv, ConfigurationError } from '@/config/env';

/**
 * Mock API is ONLY used when demo mode is explicitly enabled in development.
 * Missing Supabase without demo must NOT silently fall back to mock data.
 */
export function shouldUseMockApi(): boolean {
  return clientEnv.useMockData === true;
}

export function requireLiveApi(): void {
  if (shouldUseMockApi()) {
    return;
  }
  if (!clientEnv.hasSupabaseConfig) {
    throw new ConfigurationError(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, or enable demo mode only in development.',
    );
  }
}

export function delay(ms = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
