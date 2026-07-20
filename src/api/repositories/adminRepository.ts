import type { AdminQueueItem } from '@/api/mockData';
import { mockStore } from '@/api/mockData';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import { mapCommission, mapSupportTicket } from '@/lib/mappers';
import type { AdminDashboardStats, Commission, SupportTicket } from '@/types/domain';

export async function getAdminDashboard(): Promise<{
  stats: AdminDashboardStats;
  queue: AdminQueueItem[];
}> {
  return getAdminDashboardBundle();
}

export async function getAdminStats(): Promise<AdminDashboardStats> {
  if (shouldUseMockApi()) {
    await delay();
    return { ...mockStore.adminStats };
  }
  const supabase = requireLiveSupabase();
  const nowIso = new Date().toISOString();

  const [
    partnerApplicationsResult,
    ticketsResult,
    unreadMessagesResult,
    documentsResult,
    paymentsResult,
    commissionsResult,
    payoutsResult,
    appointmentsResult,
  ] = await Promise.all([
    supabase
      .from('partner_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'submitted'),
    supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress', 'waiting_on_customer']),
    supabase.from('message_receipts').select('*', { count: 'exact', head: true }).is('read_at', null),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'under_review'),
    supabase
      .from('payment_events')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'pending', 'authorized']),
    supabase.from('commissions').select('*', { count: 'exact', head: true }).eq('status', 'under_review'),
    supabase
      .from('payout_requests')
      .select('*', { count: 'exact', head: true })
      .in('status', ['submitted', 'under_review']),
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('starts_at', nowIso)
      .in('status', ['requested', 'confirmed']),
  ]);

  for (const result of [
    partnerApplicationsResult,
    ticketsResult,
    unreadMessagesResult,
    documentsResult,
    paymentsResult,
    commissionsResult,
    payoutsResult,
    appointmentsResult,
  ]) {
    if (result.error) throw fromSupabaseError(result.error);
  }

  return {
    openPartnerApplications: partnerApplicationsResult.count ?? 0,
    openTickets: ticketsResult.count ?? 0,
    unreadMessages: unreadMessagesResult.count ?? 0,
    documentsPendingReview: documentsResult.count ?? 0,
    openPayments: paymentsResult.count ?? 0,
    commissionsUnderReview: commissionsResult.count ?? 0,
    payoutRequests: payoutsResult.count ?? 0,
    upcomingAppointments: appointmentsResult.count ?? 0,
  };
}

export async function getAdminDashboardBundle(): Promise<{
  stats: AdminDashboardStats;
  queue: AdminQueueItem[];
}> {
  const [stats, queue] = await Promise.all([getAdminStats(), listAdminQueue()]);
  return { stats, queue };
}

export async function listAdminQueue(): Promise<AdminQueueItem[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.adminQueue];
  }
  const supabase = requireLiveSupabase();

  const [applications, tickets, commissionRows, payouts] = await Promise.all([
    supabase
      .from('partner_applications')
      .select('id, full_name, email, company_name, created_at')
      .eq('status', 'submitted')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('support_tickets')
      .select('id, subject, priority, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('commissions')
      .select('id, commission_amount_cents, currency, created_at')
      .eq('status', 'under_review')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('payout_requests')
      .select('id, amount_cents, currency, created_at')
      .in('status', ['submitted', 'under_review'])
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (applications.error) throw fromSupabaseError(applications.error);
  if (tickets.error) throw fromSupabaseError(tickets.error);
  if (commissionRows.error) throw fromSupabaseError(commissionRows.error);
  if (payouts.error) throw fromSupabaseError(payouts.error);

  const queue: AdminQueueItem[] = [
    ...(applications.data ?? []).map((row) => ({
      id: row.id,
      type: 'partner_application' as const,
      title: `Partneraanvraag — ${row.company_name ?? row.full_name}`,
      subtitle: `Ingediend door ${row.email}`,
      createdAt: row.created_at,
      priority: 'high' as const,
      companyName: row.company_name ?? undefined,
      email: row.email,
    })),
    ...(tickets.data ?? []).map((row) => ({
      id: row.id,
      type: 'support_ticket' as const,
      title: row.subject,
      subtitle: `Prioriteit ${row.priority}`,
      createdAt: row.created_at,
      priority: row.priority === 'urgent' || row.priority === 'high' ? ('high' as const) : ('medium' as const),
    })),
    ...(commissionRows.data ?? []).map((row) => ({
      id: row.id,
      type: 'commission_review' as const,
      title: 'Commissie under review',
      subtitle: `${(row.commission_amount_cents / 100).toFixed(2)} ${row.currency}`,
      createdAt: row.created_at,
      priority: 'medium' as const,
    })),
    ...(payouts.data ?? []).map((row) => ({
      id: row.id,
      type: 'payout_request' as const,
      title: 'Uitbetalingsverzoek',
      subtitle: `${(row.amount_cents / 100).toFixed(2)} ${row.currency}`,
      createdAt: row.created_at,
      priority: 'high' as const,
    })),
  ];

  return queue.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listApprovals(): Promise<AdminQueueItem[]> {
  const queue = await listAdminQueue();
  return queue.filter(
    (item) =>
      item.type === 'partner_application' ||
      item.type === 'document_review' ||
      item.type === 'commission_review',
  );
}

export async function approvePartnerApplication(
  id: string,
  actorId?: string,
): Promise<{ id: string; status: 'approved' }> {
  if (shouldUseMockApi()) {
    await delay();
    mockStore.adminQueue = mockStore.adminQueue.filter((item) => item.id !== id);
    mockStore.adminStats.openPartnerApplications = Math.max(
      0,
      mockStore.adminStats.openPartnerApplications - 1,
    );
    return { id, status: 'approved' };
  }
  const supabase = requireLiveSupabase();
  const { error } = await supabase
    .from('partner_applications')
    .update({
      status: 'approved',
      reviewed_by: actorId ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw fromSupabaseError(error);
  return { id, status: 'approved' };
}

export async function rejectPartnerApplication(
  id: string,
  actorId: string,
  internalReason: string,
): Promise<{ id: string; status: 'rejected' }> {
  if (!internalReason.trim()) {
    throw DomainError.validation('Internal rejection reason required');
  }
  if (shouldUseMockApi()) {
    await delay();
    mockStore.adminQueue = mockStore.adminQueue.filter((item) => item.id !== id);
    return { id, status: 'rejected' };
  }
  const supabase = requireLiveSupabase();
  const { error } = await supabase
    .from('partner_applications')
    .update({
      status: 'rejected',
      reviewed_by: actorId,
      reviewed_at: new Date().toISOString(),
      review_notes: internalReason,
    })
    .eq('id', id);
  if (error) throw fromSupabaseError(error);
  return { id, status: 'rejected' };
}

export async function listAdminTickets(): Promise<SupportTicket[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.tickets];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).map((row) => mapSupportTicket(row));
}

export async function listFinanceItems(): Promise<Commission[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.commissions];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .from('commissions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).map((row) => mapCommission(row));
}

export const adminRepository = {
  getDashboard: getAdminDashboard,
  getDashboardBundle: getAdminDashboardBundle,
  listQueue: listAdminQueue,
  listApprovals,
  approvePartnerApplication,
  rejectPartnerApplication,
  listAdminTickets,
  listFinanceItems,
  stats: getAdminDashboard,
  partnerApplications: listApprovals,
  listTickets: listAdminTickets,
  listCommissions: listFinanceItems,
  reviewPartnerApplication: async (id: string, decision: 'approve' | 'reject') => {
    if (decision === 'approve') {
      return approvePartnerApplication(id);
    }
    return rejectPartnerApplication(id, 'system', 'Rejected from mobile admin');
  },
  markFinanceReviewed: async (id: string) => ({ id, reviewed: true as const }),
};
