import { getRepositoryAdapter } from '@/api/repositories/_utils';

/**
 * Mirrors `getRepositoryAdapter()` for the `src/features/*` repositories.
 * Demo is only selected via the explicit adapter decision — never as a
 * fallback for a missing/misconfigured Supabase client.
 */
export function shouldUseMockRepositories(): boolean {
  return getRepositoryAdapter() === 'demo';
}
