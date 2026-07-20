import { mockStore } from '@/api/mockData';
import { delay, shouldUseMockApi } from '@/api/repositories/_utils';
import { getSupabase } from '@/lib/supabase';
import { isFeatureEnabled } from '@/security/featureFlags';
import type { Commission } from '@/types/domain';

export async function listCommissions(): Promise<Commission[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.commissions];
  }
  const supabase = getSupabase();
  if (!supabase) return [...mockStore.commissions];
  const { data, error } = await supabase.from('commissions').select('*').order('created_at', {
    ascending: false,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as Commission[];
}

export async function getCommission(id: string): Promise<Commission | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.commissions.find((c) => c.id === id) ?? null;
  }
  const supabase = getSupabase();
  if (!supabase) return mockStore.commissions.find((c) => c.id === id) ?? null;
  const { data, error } = await supabase
    .from('commissions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Commission | null;
}

/**
 * Request payout — fail-closed when partnerPayouts flag is off.
 * Never marks commissions as paid locally.
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

  const ids =
    commissionIds.length > 0
      ? commissionIds
      : mockStore.commissions.filter((c) => c.status === 'payable').map((c) => c.id);

  if (ids.length === 0) {
    return { allowed: false, requested: [], reason: 'no_payable_commissions' };
  }

  if (shouldUseMockApi()) {
    await delay();
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

  const supabase = getSupabase();
  if (!supabase) {
    return { allowed: false, requested: [], reason: 'supabase_missing' };
  }
  const { data, error } = await supabase.rpc('request_commission_payout', {
    commission_ids: ids,
  });
  if (error) {
    return { allowed: false, requested: [], reason: error.message };
  }
  return { allowed: true, requested: (data as string[] | null) ?? ids };
}

export const commissionsRepository = {
  list: listCommissions,
  get: getCommission,
  requestPayout,
};
