import type { LoginInput, RegisterInput, ForgotPasswordInput } from '@/validation';
import { getSupabase, isSupabaseReady } from '@/lib/supabase';
import { clientEnv } from '@/config/env';

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
  if (!isSupabaseReady()) {
    // Generic response — no account enumeration
    return;
  }
  const supabase = getSupabase();
  await supabase?.auth.resetPasswordForEmail(input.email, {
    redirectTo: `${clientEnv.siteUrl}/app/reset-password`,
  });
}

export type { LoginInput, RegisterInput };
