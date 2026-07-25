import type { AdminQueueItem } from '@/api/mockData';
import { DEMO_STAFF_ID, mockStore } from '@/api/mockData';
import { fromOwnerTable, rpcOwner } from '@/api/contract/ownerClient';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { listMessages } from '@/api/repositories/supportRepository';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import { mapCommission, mapLead, mapPayoutRequest } from '@/lib/mappers';
import type {
  AdminDashboardStats,
  Commission,
  Lead,
  PayoutRequest,
  SupportTicket,
  SupportTicketMessage,
  SupportTicketStatus,
} from '@/types/domain';

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
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:admin_dashboard_stats');
}

export async function getAdminDashboardBundle(): Promise<{
  stats: AdminDashboardStats;
  queue: AdminQueueItem[];
}> {
  const [stats, queue] = await Promise.all([getAdminStats(), listAdminQueue()]);
  return { stats, queue };
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
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:admin_work_queue');
}

export async function listApprovals(): Promise<AdminQueueItem[]> {
  const queue = await listAdminQueue();
  return queue
    .filter(
      (item) =>
        item.type === 'partner_application' ||
        item.type === 'document_review' ||
        item.type === 'commission_review',
    )
    .sort((a, b) => {
      // Deterministic Maestro/device start: partner applications first.
      if (a.type === 'partner_application' && b.type !== 'partner_application') return -1;
      if (b.type === 'partner_application' && a.type !== 'partner_application') return 1;
      return 0;
    });
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
  const { data, error } = await rpcOwner(supabase, 'approve_partner_application', {
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
  const { data, error } = await rpcOwner(supabase, 'reject_partner_application', {
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
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:suspend_partner');
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
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:approve_commission');
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
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:reject_commission');
}

/**
 * Marks a payout request paid via the `process_payout_request` RPC.
 * Staff-only; requires a reason; the RPC itself fails closed when the
 * `partner.payouts` / `partner_payouts` feature flag is disabled.
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
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:process_payout_request');
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
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:create_project_from_request');
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
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:mark_document_scan_clean');
}

export async function listAdminTickets(): Promise<SupportTicket[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.tickets];
  }
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:support_tickets');
}

export async function listFinanceItems(): Promise<Commission[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.commissions];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await fromOwnerTable(supabase, 'commissions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).map((row) => mapCommission(row as Parameters<typeof mapCommission>[0]));
}

/** Lists every partner lead (staff see all rows via RLS on `partner_leads`). */
export async function listPartnerLeads(): Promise<Lead[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.leads];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await fromOwnerTable(supabase, 'partner_leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).map((row) => mapLead(row as Parameters<typeof mapLead>[0]));
}

export async function getPartnerLead(id: string): Promise<Lead | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.leads.find((l) => l.id === id) ?? null;
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await fromOwnerTable(supabase, 'partner_leads')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw fromSupabaseError(error);
  return data ? mapLead(data as Parameters<typeof mapLead>[0]) : null;
}

export type LeadQualifyStatus = 'contacted' | 'qualified' | 'rejected' | 'invalid';

/**
 * Transitions a lead's status via the staff-only `admin_qualify_lead` RPC.
 * A reason is required for rejected/invalid (both client-side and, again,
 * inside the RPC) and is stored in `partner_lead_staff_notes`, never on a
 * column partners can read.
 */
export async function qualifyPartnerLead(
  leadId: string,
  status: LeadQualifyStatus,
  reason?: string,
): Promise<Lead> {
  if ((status === 'rejected' || status === 'invalid') && !reason?.trim()) {
    throw DomainError.validation('A reason is required to reject or invalidate a lead');
  }
  if (shouldUseMockApi()) {
    await delay();
    const lead = mockStore.leads.find((l) => l.id === leadId);
    if (!lead) throw DomainError.notFound('Lead not found');
    if (lead.status === 'converted') {
      throw DomainError.forbidden('A converted lead cannot be re-qualified.');
    }
    lead.status = status;
    lead.rejectedReason =
      status === 'rejected' || status === 'invalid' ? (reason ?? null) : lead.rejectedReason;
    lead.updatedAt = new Date().toISOString();
    return { ...lead };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await rpcOwner(supabase, 'admin_qualify_lead', {
    p_lead_id: leadId,
    p_status: status,
    p_reason: reason || undefined,
  });
  if (error) throw fromSupabaseError(error);
  return mapLead(data as Parameters<typeof mapLead>[0]);
}

/**
 * Converts a qualified lead into a won sale via the staff-only
 * `admin_convert_lead` RPC. The RPC prevents converting the same lead twice
 * and never re-opens a rejected/invalid lead for conversion.
 */
export async function convertPartnerLead(leadId: string, saleId?: string): Promise<Lead> {
  if (shouldUseMockApi()) {
    await delay();
    const lead = mockStore.leads.find((l) => l.id === leadId);
    if (!lead) throw DomainError.notFound('Lead not found');
    if (lead.status === 'converted') {
      throw DomainError.forbidden('This lead has already been converted.');
    }
    lead.status = 'converted';
    lead.convertedAt = new Date().toISOString();
    lead.saleId = saleId ?? lead.saleId;
    lead.updatedAt = new Date().toISOString();
    return { ...lead };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await rpcOwner(supabase, 'admin_convert_lead', {
    p_lead_id: leadId,
    p_sale_id: saleId || undefined,
  });
  if (error) throw fromSupabaseError(error);
  return mapLead(data as Parameters<typeof mapLead>[0]);
}

/** Lists submitted/under_review payout requests across all partners (staff-only via RLS). */
export async function listFinancePayoutRequests(): Promise<PayoutRequest[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.payoutRequests];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await fromOwnerTable(supabase, 'payout_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).map((row) => mapPayoutRequest(row as Parameters<typeof mapPayoutRequest>[0]));
}

/** Rejects a payout request via `reject_payout_request`. Staff-only; requires a reason; reverts commissions to payable. */
export async function rejectPayoutRequest(
  payoutId: string,
  reason: string,
): Promise<{ id: string; status: 'rejected' }> {
  if (!reason.trim()) {
    throw DomainError.validation('Payout rejection reason required');
  }
  if (shouldUseMockApi()) {
    await delay();
    const payout = mockStore.payoutRequests.find((p) => p.id === payoutId);
    if (payout) {
      payout.status = 'rejected';
      payout.notes = reason;
      payout.updatedAt = new Date().toISOString();
    }
    return { id: payoutId, status: 'rejected' };
  }
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:reject_payout_request');
}

/** Lists a ticket's messages; delegates to supportRepository (RLS already exposes internal notes to staff). */
export const listTicketMessages = listMessages;

async function replyToTicket(
  ticketId: string,
  body: string,
  isInternal: boolean,
  clientMessageId?: string,
): Promise<SupportTicketMessage> {
  if (!body.trim()) {
    throw DomainError.validation('A reply body is required');
  }
  if (shouldUseMockApi()) {
    await delay();
    const now = new Date().toISOString();
    const message: SupportTicketMessage = {
      id: `ticket-msg-${Date.now()}`,
      ticketId,
      authorId: DEMO_STAFF_ID,
      body: body.trim(),
      isInternal,
      createdAt: now,
      updatedAt: now,
    };
    mockStore.ticketMessages.push(message);
    if (!isInternal) {
      const ticket = mockStore.tickets.find((t) => t.id === ticketId);
      if (ticket && ticket.status !== 'resolved' && ticket.status !== 'closed') {
        ticket.status = 'waiting_for_customer';
        ticket.updatedAt = now;
      }
    }
    return message;
  }
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:admin_reply_support_ticket');
}

/** Sends a customer-visible reply via `admin_reply_support_ticket`. Staff-only; also flips the ticket to waiting_for_customer. */
export async function replyPublic(
  ticketId: string,
  body: string,
  clientMessageId?: string,
): Promise<SupportTicketMessage> {
  return replyToTicket(ticketId, body, false, clientMessageId);
}

/** Adds a staff-only internal note via `admin_reply_support_ticket`. Never visible to the customer; never changes ticket status. */
export async function replyInternal(
  ticketId: string,
  body: string,
  clientMessageId?: string,
): Promise<SupportTicketMessage> {
  return replyToTicket(ticketId, body, true, clientMessageId);
}

export type AdminTicketStatus =
  'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed';

/** Transitions ticket status via `admin_update_ticket_status`. Staff-only; a reason is required to resolve/close. */
export async function updateTicketStatus(
  ticketId: string,
  status: AdminTicketStatus,
  reason?: string,
  assignee?: string,
): Promise<SupportTicket> {
  if ((status === 'resolved' || status === 'closed') && !reason?.trim()) {
    throw DomainError.validation('A reason is required to resolve or close a ticket');
  }
  if (shouldUseMockApi()) {
    await delay();
    const ticket = mockStore.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw DomainError.notFound('Ticket not found');
    const domainStatus: SupportTicketStatus =
      status === 'in_progress'
        ? 'waiting_for_vdb'
        : status === 'waiting_on_customer'
          ? 'waiting_for_customer'
          : status;
    ticket.status = domainStatus;
    ticket.updatedAt = new Date().toISOString();
    return { ...ticket };
  }
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:admin_update_ticket_status');
}

/** Assigns a ticket to a staff member via `admin_assign_ticket`. Staff-only; the assignee must also be staff. */
export async function assignTicket(ticketId: string, assignee: string): Promise<SupportTicket> {
  if (shouldUseMockApi()) {
    await delay();
    const ticket = mockStore.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw DomainError.notFound('Ticket not found');
    ticket.updatedAt = new Date().toISOString();
    return { ...ticket };
  }
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:admin_assign_ticket');
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
  rejectPayoutRequest,
  listFinancePayoutRequests,
  createProjectFromRequest,
  markDocumentScanClean,
  listAdminTickets,
  listFinanceItems,
  listPartnerLeads,
  getPartnerLead,
  qualifyPartnerLead,
  convertPartnerLead,
  listTicketMessages,
  replyPublic,
  replyInternal,
  updateTicketStatus,
  assignTicket,
  stats: getAdminDashboard,
  partnerApplications: listApprovals,
  listTickets: listAdminTickets,
  listCommissions: listFinanceItems,
  listLeads: listPartnerLeads,
  listPayoutRequests: listFinancePayoutRequests,
  reviewPartnerApplication: async (id: string, decision: 'approve' | 'reject') => {
    if (decision === 'approve') {
      return approvePartnerApplication(id);
    }
    return rejectPartnerApplication(id, 'Rejected from mobile admin');
  },
};
