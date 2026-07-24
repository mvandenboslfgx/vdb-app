import type { AdminQueueItem } from '@/api/mockData';
import { DEMO_STAFF_ID, mockStore } from '@/api/mockData';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { listMessages } from '@/api/repositories/supportRepository';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import {
  mapCommission,
  mapLead,
  mapPayoutRequest,
  mapSupportTicket,
  mapSupportTicketMessage,
} from '@/lib/mappers';
import type {
  AdminDashboardStats,
  Commission,
  Lead,
  PayoutRequest,
  SupportTicket,
  SupportTicketMessage,
  SupportTicketStatus,
} from '@/types/domain';
import { createIdempotencyKey } from '@/lib/idempotency';

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

/** Lists every partner lead (staff see all rows via RLS on `partner_leads`). */
export async function listPartnerLeads(): Promise<Lead[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.leads];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .from('partner_leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).map(mapLead);
}

export async function getPartnerLead(id: string): Promise<Lead | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.leads.find((l) => l.id === id) ?? null;
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.from('partner_leads').select('*').eq('id', id).maybeSingle();
  if (error) throw fromSupabaseError(error);
  return data ? mapLead(data) : null;
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
    lead.rejectedReason = status === 'rejected' || status === 'invalid' ? reason ?? null : lead.rejectedReason;
    lead.updatedAt = new Date().toISOString();
    return { ...lead };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.rpc('admin_qualify_lead', {
    p_lead_id: leadId,
    p_status: status,
    p_reason: reason || undefined,
  });
  if (error) throw fromSupabaseError(error);
  return mapLead(data);
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
  const { data, error } = await supabase.rpc('admin_convert_lead', {
    p_lead_id: leadId,
    p_sale_id: saleId || undefined,
  });
  if (error) throw fromSupabaseError(error);
  return mapLead(data);
}

/** Lists submitted/under_review payout requests across all partners (staff-only via RLS). */
export async function listFinancePayoutRequests(): Promise<PayoutRequest[]> {
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
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.rpc('reject_payout_request', {
    p_payout_id: payoutId,
    p_reason: reason,
  });
  if (error) throw fromSupabaseError(error);
  const row = mapPayoutRequest(data);
  return { id: row.id, status: 'rejected' };
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
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.rpc('admin_reply_support_ticket', {
    p_ticket_id: ticketId,
    p_body: body.trim(),
    p_is_internal: isInternal,
    p_client_message_id: clientMessageId ?? createIdempotencyKey('ticket-reply'),
  });
  if (error) throw fromSupabaseError(error);
  return mapSupportTicketMessage(data);
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

export type AdminTicketStatus = 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed';

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
    const domainStatus: SupportTicketStatus = status === 'in_progress'
      ? 'waiting_for_vdb'
      : status === 'waiting_on_customer'
        ? 'waiting_for_customer'
        : status;
    ticket.status = domainStatus;
    ticket.updatedAt = new Date().toISOString();
    return { ...ticket };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.rpc('admin_update_ticket_status', {
    p_ticket_id: ticketId,
    p_status: status,
    p_reason: reason || undefined,
    p_assignee: assignee || undefined,
  });
  if (error) throw fromSupabaseError(error);
  return mapSupportTicket(data);
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
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.rpc('admin_assign_ticket', {
    p_ticket_id: ticketId,
    p_assignee: assignee,
  });
  if (error) throw fromSupabaseError(error);
  return mapSupportTicket(data);
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