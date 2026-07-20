import { clientEnv } from '@/config/env';
import { getSupabase } from '@/lib/supabase';

export function shouldUseMockRepositories(): boolean {
  return clientEnv.useMockData || !getSupabase();
}
