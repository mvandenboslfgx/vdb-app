import { clientEnv, hasSupabaseConfig } from '@/config/env';

export function shouldUseMockApi(): boolean {
  return clientEnv.useMockData || !hasSupabaseConfig;
}

export function delay(ms = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
