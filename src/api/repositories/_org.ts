import { fromOwnerTable } from '@/api/contract/ownerClient';
import { DomainError } from '@/lib/errors';
import type { TypedSupabaseClient } from '@/lib/supabase';

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Resolves the calling user's organization for owner surfaces that are
 * scoped by `organization_id` (e.g. booking an appointment, creating a
 * support ticket). Fails closed -- never guesses or falls back to a
 * hardcoded organization -- when there is no session or no
 * `organization_members` row for the caller.
 */
export async function resolveCallerOrganizationId(supabase: TypedSupabaseClient): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw DomainError.unauthorized('Sign in required to resolve organization membership.');
  }

  const { data, error } = await fromOwnerTable(supabase, 'organization_members')
    .select('organization_id')
    .eq('user_id', userData.user.id)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw DomainError.configuration('Unable to resolve caller organization.', { cause: error });
  }

  const organizationId = asRecord(data).organization_id;
  if (typeof organizationId !== 'string' || !organizationId) {
    throw DomainError.configuration('AUTH_NO_ACCESS:organization_members');
  }
  return organizationId;
}
