import type { AdminQueueItem } from '@/api/mockData';
import { DEMO_STAFF_ID, mockStore } from '@/api/mockData';
import {
  mapAdminDashboardStats,
  mapAdminDirectoryPage,
  mapAdminSecurityStatus,
  mapAdminSettingsSummary,
  mapAdminWorkQueue,
  newIdempotencyKey,
  type AdminDirectoryPage,
  type AdminSecurityStatus,
  type AdminSettingsSummary,
} from '@/api/contract/adminRc4Mappers';
import {
  mapAdminAppointmentDetail,
  mapAdminCustomerDetail,
  mapAdminInvoiceDetail,
  mapAdminPartnerDetail,
  mapAdminProductDetail,
  mapAdminProjectDetail,
  mapAdminQuoteDetail,
  type AdminDirectoryDetail,
} from '@/api/contract/adminRc5Mappers';
import { fromOwnerTable, rpcOwner } from '@/api/contract/ownerClient';
import { mapPortalSupportReply, mapPortalSupportTicket } from '@/api/contract/portalMappers';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import {
  listMessages,
  listStaffTicketMessages,
  listTickets,
} from '@/api/repositories/supportRepository';
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

type OwnerRow = Record<string, unknown>;

function isOwnerRow(value: unknown): value is OwnerRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function getAdminDashboard(): Promise<{
  stats: AdminDashboardStats;
  queue: AdminQueueItem[];
}> {
  return getAdminDashboardBundle();
}

/**
 * Reads aggregate counts via Owner RC4 `admin_dashboard_stats`
 * (staff-only, enforced server-side).
 */
export async function getAdminStats(): Promise<AdminDashboardStats> {
  if (shouldUseMockApi()) {
    await delay();
    return { ...mockStore.adminStats };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await rpcOwner(supabase, 'admin_dashboard_stats');
  if (error) throw fromSupabaseError(error);
  try {
    return mapAdminDashboardStats(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'admin_dashboard_stats mapper failed';
    throw DomainError.configuration(message, { details: { code: 'MAPPER_ERROR' } });
  }
}

export async function getAdminDashboardBundle(): Promise<{
  stats: AdminDashboardStats;
  queue: AdminQueueItem[];
}> {
  const [stats, queue] = await Promise.all([getAdminStats(), listAdminQueue()]);
  return { stats, queue };
}

/**
 * Reads the combined work queue via Owner RC4 `admin_work_queue`.
 */
export async function listAdminQueue(options?: {
  limit?: number;
  cursor?: string | null;
  types?: string[] | null;
}): Promise<AdminQueueItem[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.adminQueue];
  }
  const page = await listAdminWorkQueuePage(options);
  return page.items;
}

export async function listAdminWorkQueuePage(options?: {
  limit?: number;
  cursor?: string | null;
  types?: string[] | null;
}) {
  if (shouldUseMockApi()) {
    await delay();
    return {
      items: [...mockStore.adminQueue],
      nextCursor: null as string | null,
      schemaVersion: 'mock',
    };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await rpcOwner(supabase, 'admin_work_queue', {
    p_limit: options?.limit ?? 25,
    p_cursor: options?.cursor ?? undefined,
    p_types: options?.types ?? undefined,
  });
  if (error) throw fromSupabaseError(error);
  try {
    return mapAdminWorkQueue(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'admin_work_queue mapper failed';
    throw DomainError.configuration(message, { details: { code: 'MAPPER_ERROR' } });
  }
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

/** Suspends an approved partner via Owner RC4 `suspend_partner` (admin/owner + AAL2). */
export async function suspendPartner(
  partnerId: string,
  reason: string,
  idempotencyKey?: string,
): Promise<{ id: string; status: string; previousStatus?: string; auditId?: string }> {
  if (!reason.trim() || reason.trim().length < 8) {
    throw DomainError.validation('Suspension reason required (min 8 characters)');
  }
  if (shouldUseMockApi()) {
    await delay();
    return { id: partnerId, status: 'SUSPENDED' };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await rpcOwner(supabase, 'suspend_partner', {
    p_partner_id: partnerId,
    p_reason: reason.trim(),
    p_idempotency_key: idempotencyKey ?? newIdempotencyKey('suspend_partner'),
  });
  if (error) throw fromSupabaseError(error);
  const row = isOwnerRow(data) ? data : {};
  return {
    id: typeof row.id === 'string' ? row.id : partnerId,
    status: typeof row.status === 'string' ? row.status : 'SUSPENDED',
    previousStatus: typeof row.previous_status === 'string' ? row.previous_status : undefined,
    auditId: typeof row.audit_id === 'string' ? row.audit_id : undefined,
  };
}

/** Reactivates a suspended partner via Owner RC4 `reactivate_partner` (admin/owner + AAL2). */
export async function reactivatePartner(
  partnerId: string,
  reason: string,
  idempotencyKey?: string,
): Promise<{ id: string; status: string; previousStatus?: string; auditId?: string }> {
  if (!reason.trim() || reason.trim().length < 8) {
    throw DomainError.validation('Reactivation reason required (min 8 characters)');
  }
  if (shouldUseMockApi()) {
    await delay();
    return { id: partnerId, status: 'ACTIVE' };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await rpcOwner(supabase, 'reactivate_partner', {
    p_partner_id: partnerId,
    p_reason: reason.trim(),
    p_idempotency_key: idempotencyKey ?? newIdempotencyKey('reactivate_partner'),
  });
  if (error) throw fromSupabaseError(error);
  const row = isOwnerRow(data) ? data : {};
  return {
    id: typeof row.id === 'string' ? row.id : partnerId,
    status: typeof row.status === 'string' ? row.status : 'ACTIVE',
    previousStatus: typeof row.previous_status === 'string' ? row.previous_status : undefined,
    auditId: typeof row.audit_id === 'string' ? row.audit_id : undefined,
  };
}

/** Approves a commission via Owner RC4 `approve_partner_commission` (admin/owner + AAL2). */
export async function approveCommission(
  commissionId: string,
  reason: string,
  idempotencyKey?: string,
): Promise<{ id: string; status: 'approved'; auditId?: string }> {
  if (!reason.trim() || reason.trim().length < 8) {
    throw DomainError.validation('Approval reason required (min 8 characters)');
  }
  if (shouldUseMockApi()) {
    await delay();
    return { id: commissionId, status: 'approved' };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await rpcOwner(supabase, 'approve_commission', {
    p_commission_id: commissionId,
    p_reason: reason.trim(),
    p_idempotency_key: idempotencyKey ?? newIdempotencyKey('approve_commission'),
  });
  if (error) throw fromSupabaseError(error);
  const row = isOwnerRow(data) ? data : {};
  return {
    id: typeof row.id === 'string' ? row.id : commissionId,
    status: 'approved',
    auditId: typeof row.audit_id === 'string' ? row.audit_id : undefined,
  };
}

/** Rejects a commission via Owner RC4 `reject_partner_commission` (admin/owner + AAL2). */
export async function rejectCommission(
  commissionId: string,
  reason: string,
  idempotencyKey?: string,
): Promise<{ id: string; status: 'rejected'; auditId?: string }> {
  if (!reason.trim() || reason.trim().length < 8) {
    throw DomainError.validation('Rejection reason required (min 8 characters)');
  }
  if (shouldUseMockApi()) {
    await delay();
    return { id: commissionId, status: 'rejected' };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await rpcOwner(supabase, 'reject_commission', {
    p_commission_id: commissionId,
    p_reason: reason.trim(),
    p_idempotency_key: idempotencyKey ?? newIdempotencyKey('reject_commission'),
  });
  if (error) throw fromSupabaseError(error);
  const row = isOwnerRow(data) ? data : {};
  return {
    id: typeof row.id === 'string' ? row.id : commissionId,
    status: 'rejected',
    auditId: typeof row.audit_id === 'string' ? row.audit_id : undefined,
  };
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
  // Staff/admin see all rows via RLS on portal_support_tickets (rc.3 allowlisted).
  return listTickets();
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

/** Lists a ticket's messages for staff/admin (includes internal notes via RLS). */
export const listTicketMessages = listStaffTicketMessages;

/** Customer-safe public-only message list (kept for shared imports). */
export const listPublicTicketMessages = listMessages;

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
  if (isInternal) {
    const { data, error } = await rpcOwner(supabase, 'add_portal_support_internal_note', {
      p_ticket_id: ticketId,
      p_body: body.trim(),
    });
    if (error) throw fromSupabaseError(error);
    if (isOwnerRow(data)) return { ...mapPortalSupportReply(data), isInternal: true };
    const now = new Date().toISOString();
    return {
      id: typeof data === 'string' ? data : `ticket-msg-${Date.now()}`,
      ticketId,
      authorId: DEMO_STAFF_ID,
      body: body.trim(),
      isInternal: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  const { data, error } = await rpcOwner(supabase, 'admin_reply_support_ticket', {
    p_ticket_id: ticketId,
    p_body: body.trim(),
  });
  if (error) throw fromSupabaseError(error);
  if (isOwnerRow(data)) return mapPortalSupportReply(data);

  const now = new Date().toISOString();
  return {
    id: typeof data === 'string' ? data : `ticket-msg-${Date.now()}`,
    ticketId,
    authorId: DEMO_STAFF_ID,
    body: body.trim(),
    isInternal: false,
    createdAt: now,
    updatedAt: now,
  };
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
  const supabase = requireLiveSupabase();
  const { data, error } = await rpcOwner(supabase, 'admin_update_ticket_status', {
    p_ticket_id: ticketId,
    p_status: status,
    ...(reason?.trim() ? { p_reason: reason.trim() } : {}),
    ...(assignee ? { p_assignee: assignee } : {}),
  });
  if (error) throw fromSupabaseError(error);
  if (isOwnerRow(data)) {
    return mapPortalSupportTicket(data);
  }
  const ticket = await listTickets().then((rows) => rows.find((t) => t.id === ticketId));
  if (!ticket) throw DomainError.notFound('Ticket not found');
  return {
    ...ticket,
    status:
      status === 'in_progress'
        ? 'waiting_for_vdb'
        : status === 'waiting_on_customer'
          ? 'waiting_for_customer'
          : status,
  };
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
  const { data, error } = await rpcOwner(supabase, 'admin_assign_ticket', {
    p_ticket_id: ticketId,
    p_assignee: assignee,
  });
  if (error) throw fromSupabaseError(error);
  if (isOwnerRow(data)) {
    return mapPortalSupportTicket(data);
  }
  const ticket = await listTickets().then((rows) => rows.find((t) => t.id === ticketId));
  if (!ticket) throw DomainError.notFound('Ticket not found');
  return ticket;
}

const DIRECTORY_TITLE_KEYS = {
  products: ['name', 'title', 'slug'],
  partners: ['display_name', 'company_name', 'code', 'id'], // company_name optional — PARTICULIER partners may have none
  customers: ['name', 'organization_name', 'id'],
  projects: ['title', 'name', 'id'],
  quotes: ['quote_number', 'title', 'id'],
  invoices: ['invoice_number', 'title', 'id'],
  appointments: ['title', 'starts_at', 'id'],
} as const;

function titleKeysFor(surface: keyof typeof DIRECTORY_TITLE_KEYS): string[] {
  return [...DIRECTORY_TITLE_KEYS[surface]];
}

async function listAdminDirectory(
  rpcName:
    | 'admin_list_products'
    | 'admin_list_partners'
    | 'admin_list_customers'
    | 'admin_list_projects'
    | 'admin_list_quotes'
    | 'admin_list_invoices'
    | 'admin_list_appointments',
  titleKeys: string[],
  options?: { limit?: number; cursor?: string | null; status?: string | null },
): Promise<AdminDirectoryPage> {
  if (shouldUseMockApi()) {
    await delay();
    return { items: [], nextCursor: null, schemaVersion: 'mock' };
  }
  const supabase = requireLiveSupabase();
  const args: Record<string, unknown> = {
    p_limit: options?.limit ?? 25,
  };
  if (options?.cursor) args.p_cursor = options.cursor;
  if (options?.status) args.p_status = options.status;
  const { data, error } = await rpcOwner(supabase, rpcName, args);
  if (error) throw fromSupabaseError(error);
  return mapAdminDirectoryPage(data, titleKeys);
}

export async function listAdminProducts(options?: {
  limit?: number;
  cursor?: string | null;
  status?: string | null;
}) {
  return listAdminDirectory('admin_list_products', titleKeysFor('products'), options);
}

export async function listAdminPartners(options?: {
  limit?: number;
  cursor?: string | null;
  status?: string | null;
}) {
  return listAdminDirectory('admin_list_partners', titleKeysFor('partners'), options);
}

export async function listAdminCustomers(options?: {
  limit?: number;
  cursor?: string | null;
  status?: string | null;
}) {
  return listAdminDirectory('admin_list_customers', titleKeysFor('customers'), options);
}

export async function listAdminProjects(options?: {
  limit?: number;
  cursor?: string | null;
  status?: string | null;
}) {
  return listAdminDirectory('admin_list_projects', titleKeysFor('projects'), options);
}

export async function listAdminQuotes(options?: {
  limit?: number;
  cursor?: string | null;
  status?: string | null;
}) {
  return listAdminDirectory('admin_list_quotes', titleKeysFor('quotes'), options);
}

export async function listAdminInvoices(options?: {
  limit?: number;
  cursor?: string | null;
  status?: string | null;
}) {
  return listAdminDirectory('admin_list_invoices', titleKeysFor('invoices'), options);
}

export async function listAdminAppointments(options?: {
  limit?: number;
  cursor?: string | null;
  status?: string | null;
}) {
  return listAdminDirectory('admin_list_appointments', titleKeysFor('appointments'), options);
}

async function getAdminDetail(
  rpcName:
    | 'admin_get_product'
    | 'admin_get_partner'
    | 'admin_get_customer'
    | 'admin_get_project'
    | 'admin_get_quote'
    | 'admin_get_invoice'
    | 'admin_get_appointment',
  id: string,
  mapper: (raw: unknown) => AdminDirectoryDetail,
  argName: string,
): Promise<AdminDirectoryDetail> {
  if (!id.trim()) throw DomainError.validation('Detail id required');
  if (shouldUseMockApi()) {
    await delay();
    throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:admin_detail_mock');
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await rpcOwner(supabase, rpcName, { [argName]: id });
  if (error) throw fromSupabaseError(error);
  return mapper(data);
}

export function getAdminProductDetail(id: string) {
  return getAdminDetail('admin_get_product', id, mapAdminProductDetail, 'p_product_id');
}
export function getAdminPartnerDetail(id: string) {
  return getAdminDetail('admin_get_partner', id, mapAdminPartnerDetail, 'p_partner_id');
}
export function getAdminCustomerDetail(id: string) {
  return getAdminDetail('admin_get_customer', id, mapAdminCustomerDetail, 'p_organization_id');
}
export function getAdminProjectDetail(id: string) {
  return getAdminDetail('admin_get_project', id, mapAdminProjectDetail, 'p_project_id');
}
export function getAdminQuoteDetail(id: string) {
  return getAdminDetail('admin_get_quote', id, mapAdminQuoteDetail, 'p_quote_id');
}
export function getAdminInvoiceDetail(id: string) {
  return getAdminDetail('admin_get_invoice', id, mapAdminInvoiceDetail, 'p_invoice_id');
}
export function getAdminAppointmentDetail(id: string) {
  return getAdminDetail('admin_get_appointment', id, mapAdminAppointmentDetail, 'p_appointment_id');
}

export async function getAdminSettingsSummary(): Promise<AdminSettingsSummary> {
  if (shouldUseMockApi()) {
    await delay();
    return mapAdminSettingsSummary({
      environment: 'development',
      contract_version: 'mock',
      schema_version: 'mock',
      whatsapp_configured: true,
      checkout_enabled: false,
      mollie_enabled: false,
      partner_payouts_enabled: false,
      messaging_realtime: false,
      appointments_booking: false,
    });
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await rpcOwner(supabase, 'admin_get_settings_summary');
  if (error) throw fromSupabaseError(error);
  return mapAdminSettingsSummary(data);
}

export async function getAdminSecurityStatus(): Promise<AdminSecurityStatus> {
  if (shouldUseMockApi()) {
    await delay();
    return mapAdminSecurityStatus({
      current_aal: 'aal1',
      mfa_enrolled: false,
      mfa_required: false,
      step_up_required: false,
      actor_role: 'admin',
      capabilities: [],
    });
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await rpcOwner(supabase, 'admin_get_security_status');
  if (error) throw fromSupabaseError(error);
  return mapAdminSecurityStatus(data);
}

export const adminRepository = {
  getDashboard: getAdminDashboard,
  getDashboardBundle: getAdminDashboardBundle,
  listQueue: listAdminQueue,
  listApprovals,
  approvePartnerApplication,
  rejectPartnerApplication,
  suspendPartner,
  reactivatePartner,
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
  listPublicTicketMessages,
  replyPublic,
  replyInternal,
  updateTicketStatus,
  assignTicket,
  listAdminProducts,
  listAdminPartners,
  listAdminCustomers,
  listAdminProjects,
  listAdminQuotes,
  listAdminInvoices,
  listAdminAppointments,
  getAdminProductDetail,
  getAdminPartnerDetail,
  getAdminCustomerDetail,
  getAdminProjectDetail,
  getAdminQuoteDetail,
  getAdminInvoiceDetail,
  getAdminAppointmentDetail,
  getAdminSettingsSummary,
  getAdminSecurityStatus,
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
