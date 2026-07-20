import type { AdminQueueItem } from '@/api/mockData';
import { mockStore } from '@/api/mockData';
import { delay, shouldUseMockApi } from '@/api/repositories/_utils';
import { getSupabase } from '@/lib/supabase';
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
  const supabase = getSupabase();
  if (!supabase) return { ...mockStore.adminStats };
  const { data, error } = await supabase.rpc('admin_dashboard_stats');
  if (error) throw new Error(error.message);
  return data as AdminDashboardStats;
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
  const supabase = getSupabase();
  if (!supabase) return [...mockStore.adminQueue];
  const { data, error } = await supabase.rpc('admin_work_queue');
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminQueueItem[];
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
  _actorId?: string,
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
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.rpc('approve_partner_application', { application_id: id });
  if (error) throw new Error(error.message);
  return { id, status: 'approved' };
}

export async function rejectPartnerApplication(
  id: string,
  _actorId: string,
  internalReason: string,
): Promise<{ id: string; status: 'rejected' }> {
  if (!internalReason.trim()) {
    throw new Error('Internal rejection reason required');
  }
  if (shouldUseMockApi()) {
    await delay();
    mockStore.adminQueue = mockStore.adminQueue.filter((item) => item.id !== id);
    return { id, status: 'rejected' };
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.rpc('reject_partner_application', {
    application_id: id,
    reason: internalReason,
  });
  if (error) throw new Error(error.message);
  return { id, status: 'rejected' };
}

export async function listAdminTickets(): Promise<SupportTicket[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.tickets];
  }
  return [...mockStore.tickets];
}

export async function listFinanceItems(): Promise<Commission[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.commissions];
  }
  return [...mockStore.commissions];
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
