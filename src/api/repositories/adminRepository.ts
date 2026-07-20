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

/**
 * Reads aggregate counts via the `admin_dashboard_stats` SECURITY DEFINER
 * RPC (staff-only, enforced server-side). We no longer run ad-hoc counting
 * queries from the client -- the RPC is the single source of truth for what
 * "admin dashboard stats" means.
 */
export async function getAdminStats(): Promise<AdminDashboardStats> {
  if (shouldUseMockApi()) {
    await delay();
    return { ...mockStore.adminStats };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.rpc('admin_dashboard_stats');
  if (error) throw fromSupabaseError(error);

  const stats = data as Record<string, number>;
  return {
    openPartnerApplications: stats.open_partner_applications ?? 0,
    openTickets: stats.open_tickets ?? 0,
    unreadMessages: stats.unread_messages ?? 0,
    documentsPendingReview: stats.documents_pending_review ?? 0,
    openPayments: stats.open_payments ?? 0,
    commissionsUnderReview: stats.commissions_under_review ?? 0,
    payoutRequests: stats.payout_requests ?? 0,
    upcomingAppointments: stats.upcoming_appointments ?? 0,
  };
}

export async function getAdminDashboardBundle(): Promise<{
  stats: AdminDashboardStats;
  queue: AdminQueueItem[];
}> {
  const [stats, queue] = await Promise.all([getAdminStats(), listAdminQueue()]);
  return { stats, queue };
}

interface AdminWorkQueueRow {
  id: string;
  type: AdminQueueItem['type'];
  title: string;
  subtitle: string;
  created_at: string;
  priority: AdminQueueItem['priority'];
  company_name?: string | null;
  email?: string | null;
}

/**
 * Reads the combined approvals/finance/support queue via the
 * `admin_work_queue` SECURITY DEFINER RPC (staff-only, enforced
 * server-side).
 */
export async function listAdminQueue(): Promise<AdminQueueItem[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.adminQueue];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.rpc('admin_work_queue');
  if (error) throw fromSupabaseError(error);

  const rows = (data as AdminWorkQueueRow[] | null) ?? [];
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    subtitle: row.subtitle,
    createdAt: row.created_at,
    priority: row.priority,
    companyName: row.company_name ?? undefined,
    email: row.email ?? undefined,
  }));
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

/**
 * Approves a partner application via the `approve_partner_application`
 * SECURITY DEFINER RPC. The database performs the staff check, blocks
 * self-approval, grants the `partner` role, and creates/activates the
 * partner profile + code -- this repository never writes those tables
 * directly.
 */
export async function approvePartnerApplication(
  id: string,
  reason?: string,
): Promise<{ id: string; status: 'approved'; partnerId?: string }> {
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
  const { data, error } = await supabase.rpc('approve_partner_application', {
    p_application_id: id,
    p_reason: reason ?? undefined,
  });
  if (error) throw fromSupabaseError(error);
  const result = data as { id: string; status: 'approved'; partnerId?: string };
  return result;
}

/**
 * Rejects a partner application via the `reject_partner_application`
 * SECURITY DEFINER RPC. A non-empty reason is required both client-side
 * (fail fast) and server-side (the RPC re-validates independently).
 */
export async function rejectPartnerApplication(
  id: string,
  reason: string,
): Promise<{ id: string; status: 'rejected' }> {
  if (!reason.trim()) {
    throw DomainError.validation('Internal rejection reason required');
  }
  if (shouldUseMockApi()) {
    await delay();
    mockStore.adminQueue = mockStore.adminQueue.filter((item) => item.id !== id);
    return { id, status: 'rejected' };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.rpc('reject_partner_application', {
    p_application_id: id,
    p_reason: reason,
  });
  if (error) throw fromSupabaseError(error);
  return data as { id: string; status: 'rejected' };
}

/** Suspends an approved partner via the `suspend_partner` RPC. Staff-only; requires a reason. */
export async function suspendPartner(
  partnerId: string,
  reason: string,
): Promise<{ id: string; isActive: false }> {
  if (!reason.trim()) {
    throw DomainError.validation('Suspension reason required');
  }
  if (shouldUseMockApi()) {
    await delay();
    return { id: partnerId, isActive: false };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.rpc('suspend_partner', {
    p_partner_id: partnerId,
    p_reason: reason,
  });
  if (error) throw fromSupabaseError(error);
  return data as { id: string; isActive: false };
}

/** Approves a commission via the `approve_commission` RPC. Staff-only; requires a reason; blocks partner self-approval. */
export async function approveCommission(
  commissionId: string,
  reason: string,
): Promise<{ id: string; status: 'approved' }> {
  if (!reason.trim()) {
    throw DomainError.validation('Approval reason required');
  }
  if (shouldUseMockApi()) {
    await delay();
    return { id: commissionId, status: 'approved' };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.rpc('approve_commission', {
    p_commission_id: commissionId,
    p_reason: reason,
  });
  if (error) throw fromSupabaseError(error);
  return data as { id: string; status: 'approved' };
}

/** Rejects a commission via the `reject_commission` RPC. Staff-only; requires a reason; blocks partner self-review. */
export async function rejectCommission(
  commissionId: string,
  reason: string,
): Promise<{ id: string; status: 'rejected' }> {
  if (!reason.trim()) {
    throw DomainError.validation('Rejection reason required');
  }
  if (shouldUseMockApi()) {
    await delay();
    return { id: commissionId, status: 'rejected' };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.rpc('reject_commission', {
    p_commission_id: commissionId,
    p_reason: reason,
  });
  if (error) throw fromSupabaseError(error);
  return data as { id: string; status: 'rejected' };
}

/**
 * Marks a payout request paid via the `process_payout_request` RPC.
 * Staff-only; requires a reason; the RPC itself fails closed when the
 * `partner.payouts` feature flag is disabled.
 */
export async function processPayoutRequest(
  payoutId: string,
  reason: string,
): Promise<{ id: string; status: 'paid'; commissionsMarkedPaid: number }> {
  if (!reason.trim()) {
    throw DomainError.validation('Payout processing reason required');
  }
  if (shouldUseMockApi()) {
    await delay();
    return { id: payoutId, status: 'paid', commissionsMarkedPaid: 0 };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.rpc('process_payout_request', {
    p_payout_id: payoutId,
    p_reason: reason,
  });
  if (error) throw fromSupabaseError(error);
  return data as { id: string; status: 'paid'; commissionsMarkedPaid: number };
}

/**
 * Converts a project request into an active project via the
 * `create_project_from_request` RPC. Staff-only; ensures a `project_members`
 * row exists for the customer.
 */
export async function createProjectFromRequest(projectId: string, status = 'intake') {
  if (shouldUseMockApi()) {
    await delay();
    return { id: projectId, status };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .rpc('create_project_from_request', {
      p_project_id: projectId,
      p_status: status,
    });
  if (error) throw fromSupabaseError(error);
  return data;
}

/**
 * DEV-ONLY helper: marks a document version's scan clean via
 * `mark_document_scan_clean`. Staff-only. There is no antivirus provider
 * wired up in this repo, so this is the only way to unblock a locally
 * uploaded file for review/testing.
 */
export async function markDocumentScanClean(
  versionId: string,
): Promise<{ id: string; scanStatus: 'clean' }> {
  if (shouldUseMockApi()) {
    await delay();
    return { id: versionId, scanStatus: 'clean' };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.rpc('mark_document_scan_clean', {
    p_version_id: versionId,
  });
  if (error) throw fromSupabaseError(error);
  return data as { id: string; scanStatus: 'clean' };
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
  suspendPartner,
  approveCommission,
  rejectCommission,
  processPayoutRequest,
  createProjectFromRequest,
  markDocumentScanClean,
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
    return rejectPartnerApplication(id, 'Rejected from mobile admin');
  },
  markFinanceReviewed: async (id: string) => ({ id, reviewed: true as const }),
};
