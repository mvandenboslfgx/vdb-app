import { mockStore } from '@/api/mockData';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { fromSupabaseError } from '@/lib/errors';
import { mapCommission, mapPayoutRequest } from '@/lib/mappers';
import { isFeatureEnabled } from '@/security/featureFlags';
import type { Commission, PayoutRequest } from '@/types/domain';

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
 * Sums the calling partner's `payable` commissions — the balance they could
 * request a payout for right now. Mirrors exactly what
 * `request_commission_payout` will select server-side when no explicit
 * commission ids are passed.
 */
export async function getPayableBalance(): Promise<{
  amountCents: number;
  currency: 'EUR';
  commissionIds: string[];
}> {
  if (shouldUseMockApi()) {
    await delay();
    const payable = mockStore.commissions.filter((c) => c.status === 'payable');
    return {
      amountCents: payable.reduce((sum, c) => sum + c.amountCents, 0),
      currency: 'EUR',
      commissionIds: payable.map((c) => c.id),
    };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .from('commissions')
    .select('id, commission_amount_cents')
    .eq('status', 'payable');
  if (error) throw fromSupabaseError(error);
  const rows = data ?? [];
  return {
    amountCents: rows.reduce((sum, row) => sum + row.commission_amount_cents, 0),
    currency: 'EUR',
    commissionIds: rows.map((row) => row.id),
  };
}

/** Lists the calling partner's payout requests (RLS restricts to their own rows). */
export async function listPayoutRequests(): Promise<PayoutRequest[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.payoutRequests];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .from('payout_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).map(mapPayoutRequest);
}

export type RequestPayoutFailureReason =
  | 'partner_payouts_disabled'
  | 'suspended'
  | 'insufficient_balance'
  | 'no_payable_commissions'
  | 'unknown';

export interface RequestPayoutResult {
  allowed: boolean;
  requested: string[];
  reason?: RequestPayoutFailureReason;
  payoutRequest?: PayoutRequest;
}

/**
 * Request payout — fail-closed when the partnerPayouts flag is off. Never
 * marks commissions as paid locally; the `request_commission_payout` RPC
 * (see supabase/migrations/20260720101700_payouts_support_finance.sql) is
 * the single place amounts/eligibility are computed and enforced, with
 * FOR UPDATE row locks that make it safe against concurrent double-spend.
 */
export async function requestPayout(
  commissionIds: string[] = [],
  amountCents?: number,
  payoutAccountId?: string,
): Promise<RequestPayoutResult> {
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
    let total = 0;
    for (const id of ids) {
      const item = mockStore.commissions.find((c) => c.id === id);
      if (item && item.status === 'payable') {
        item.status = 'payout_requested';
        item.updatedAt = new Date().toISOString();
        requested.push(id);
        total += item.amountCents;
      }
    }
    const now = new Date().toISOString();
    const payoutRequest: PayoutRequest = {
      id: `payout-${Date.now()}`,
      partnerId: mockStore.partner.id,
      payoutAccountId: 'mock-payout-account',
      status: 'submitted',
      amountCents: amountCents ?? total,
      currency: 'EUR',
      submittedAt: now,
      notes: null,
      createdAt: now,
      updatedAt: now,
    };
    mockStore.payoutRequests.unshift(payoutRequest);
    return { allowed: true, requested, payoutRequest };
  }

  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.rpc('request_commission_payout', {
    p_commission_ids: commissionIds.length > 0 ? commissionIds : undefined,
    p_amount_cents: amountCents ?? undefined,
    p_payout_account_id: payoutAccountId ?? undefined,
  });
  if (error) {
    const message = error.message ?? '';
    if (message.includes('FEATURE_NOT_CONFIGURED')) {
      return { allowed: false, requested: [], reason: 'partner_payouts_disabled' };
    }
    if (message.includes('suspended')) {
      return { allowed: false, requested: [], reason: 'suspended' };
    }
    if (
      message.includes('exceeds your payable balance') ||
      message.includes('No payable commissions')
    ) {
      return { allowed: false, requested: [], reason: 'insufficient_balance' };
    }
    throw fromSupabaseError(error);
  }
  const payoutRequest = mapPayoutRequest(data);
  return { allowed: true, requested: commissionIds, payoutRequest };
}

export const commissionsRepository = {
  list: listCommissions,
  get: getCommission,
  getPayableBalance,
  listPayoutRequests,
  requestPayout,
};
