import { mockStore } from '@/api/mockData';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import { mapCommission } from '@/lib/mappers';
import { isFeatureEnabled } from '@/security/featureFlags';
import type { Commission } from '@/types/domain';

export async function listCommissions(): Promise<Commission[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.commissions];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.from('commissions').select('*').order('created_at', {
    ascending: false,
  });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).map((row) => mapCommission(row));
}

export async function getCommission(id: string): Promise<Commission | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.commissions.find((c) => c.id === id) ?? null;
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .from('commissions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw fromSupabaseError(error);
  return data ? mapCommission(data) : null;
}

/**
 * Request payout — fail-closed when the partnerPayouts flag is off.
 * Never marks commissions as paid locally, and never silently returns mock
 * success/failure when Supabase is unreachable.
 */
export async function requestPayout(
  commissionIds: string[] = [],
): Promise<{ allowed: boolean; requested: string[]; reason?: string }> {
  if (!isFeatureEnabled('partnerPayouts')) {
    return {
      allowed: false,
      requested: [],
      reason: 'partner_payouts_disabled',
    };
  }

  if (shouldUseMockApi()) {
    await delay();
    const ids =
      commissionIds.length > 0
        ? commissionIds
        : mockStore.commissions.filter((c) => c.status === 'payable').map((c) => c.id);
    if (ids.length === 0) {
      return { allowed: false, requested: [], reason: 'no_payable_commissions' };
    }
    const requested: string[] = [];
    for (const id of ids) {
      const item = mockStore.commissions.find((c) => c.id === id);
      if (item && item.status === 'payable') {
        item.status = 'payout_requested';
        item.updatedAt = new Date().toISOString();
        requested.push(id);
      }
    }
    return { allowed: true, requested };
  }

  requireLiveSupabase();

  // The `request_commission_payout` RPC has not been implemented server-side
  // yet. Fail closed with a clear error rather than calling a function that
  // does not exist or silently marking commissions as requested.
  throw DomainError.configuration(
    'Payout requests are not yet available: the request_commission_payout RPC has not been implemented.',
  );
}

export const commissionsRepository = {
  list: listCommissions,
  get: getCommission,
  requestPayout,
};
