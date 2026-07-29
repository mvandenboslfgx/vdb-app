import { mockStore } from '@/api/mockData';
import { fromOwnerTable, rpcOwner } from '@/api/contract/ownerClient';
import {
  mapPortalSupportReply,
  mapPortalSupportTicket,
  toOwnerSupportPriority,
} from '@/api/contract/portalMappers';
import { mapSupportTicketRepliesPage } from '@/api/contract/adminRc5Mappers';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { resolveCallerOrganizationId } from '@/api/repositories/_org';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import type { SupportTicket, SupportTicketMessage } from '@/types/domain';
import type { SupportTicketInput } from '@/validation/support';

type OwnerRow = Record<string, unknown>;

function isOwnerRow(value: unknown): value is OwnerRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function newTicketNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MOB-${stamp}-${rand}`;
}

export async function listTickets(): Promise<SupportTicket[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.tickets];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await fromOwnerTable(supabase, 'support_tickets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).filter(isOwnerRow).map(mapPortalSupportTicket);
}

export async function getTicket(id: string): Promise<SupportTicket | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.tickets.find((t) => t.id === id) ?? null;
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await fromOwnerTable(supabase, 'support_tickets')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw fromSupabaseError(error);
  return data && isOwnerRow(data) ? mapPortalSupportTicket(data) : null;
}

export async function createTicket(input: SupportTicketInput): Promise<SupportTicket> {
  if (shouldUseMockApi()) {
    await delay();
    const ticket: SupportTicket = {
      id: `ticket-${Date.now()}`,
      subject: input.subject,
      category: input.category,
      priority: input.priority,
      status: 'new',
      description: input.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockStore.tickets.unshift(ticket);
    return ticket;
  }

  const supabase = requireLiveSupabase();
  const organizationId = await resolveCallerOrganizationId(supabase);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw DomainError.unauthorized('Sign in required to create a support ticket.');
  }

  const { data, error } = await fromOwnerTable(supabase, 'support_tickets')
    .insert({
      organization_id: organizationId,
      ticket_number: newTicketNumber(),
      subject: input.subject.trim(),
      description: input.description.trim(),
      category: input.category.toUpperCase(),
      priority: toOwnerSupportPriority(input.priority),
      status: 'NEW',
      created_by: userData.user.id,
      ...(input.projectId ? { project_id: input.projectId } : {}),
    })
    .select('*')
    .single();
  if (error) throw fromSupabaseError(error);
  if (!isOwnerRow(data)) {
    throw DomainError.configuration('Owner support ticket response has an unexpected shape.');
  }
  return mapPortalSupportTicket(data);
}

/**
 * Lists ticket replies via Owner RC5 `list_portal_support_ticket_replies`.
 * Customer-safe: server filters internals; client also drops is_internal as defense in depth.
 */
export async function listMessages(ticketId: string): Promise<SupportTicketMessage[]> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.ticketMessages.filter(
      (m) => m.ticketId === ticketId && m.isInternal === false,
    );
  }
  const page = await listTicketRepliesPage(ticketId);
  return page.items
    .filter((m) => !m.isInternal)
    .map((m) => ({
      id: m.id,
      ticketId: m.ticketId,
      authorId: m.authorUserId ?? '',
      body: m.body,
      isInternal: false,
      createdAt: m.createdAt,
      updatedAt: m.createdAt,
    }))
    .reverse();
}

/**
 * Staff/admin ticket detail via `list_portal_support_ticket_replies` (includes internals for staff).
 */
export async function listStaffTicketMessages(ticketId: string): Promise<SupportTicketMessage[]> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.ticketMessages.filter((m) => m.ticketId === ticketId);
  }
  const page = await listTicketRepliesPage(ticketId);
  return page.items
    .map((m) => ({
      id: m.id,
      ticketId: m.ticketId,
      authorId: m.authorUserId ?? '',
      body: m.body,
      isInternal: m.isInternal,
      createdAt: m.createdAt,
      updatedAt: m.createdAt,
    }))
    .reverse();
}

async function listTicketRepliesPage(ticketId: string, cursor?: string | null) {
  const supabase = requireLiveSupabase();
  const args: Record<string, unknown> = {
    p_ticket_id: ticketId,
    p_limit: 50,
  };
  if (cursor) args.p_cursor = cursor;
  const { data, error } = await rpcOwner(supabase, 'list_portal_support_ticket_replies', args);
  if (error) throw fromSupabaseError(error);
  return mapSupportTicketRepliesPage(data);
}

/**
 * Sends a customer-visible reply via `reply_portal_support_ticket`. Customer
 * flows must never call an internal-note RPC -- this always replies publicly.
 */
export async function replyTicket(ticketId: string, body: string): Promise<SupportTicketMessage> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw DomainError.validation('A reply body is required');
  }
  if (shouldUseMockApi()) {
    await delay();
    const now = new Date().toISOString();
    const message: SupportTicketMessage = {
      id: `ticket-msg-${Date.now()}`,
      ticketId,
      authorId: 'demo-customer-0001',
      body: trimmed,
      isInternal: false,
      createdAt: now,
      updatedAt: now,
    };
    mockStore.ticketMessages.push(message);
    return message;
  }

  const supabase = requireLiveSupabase();
  const { data, error } = await rpcOwner(supabase, 'reply_portal_support_ticket', {
    p_ticket_id: ticketId,
    p_body: trimmed,
  });
  if (error) throw fromSupabaseError(error);
  if (isOwnerRow(data)) return mapPortalSupportReply(data);

  const replyId = typeof data === 'string' ? data : null;
  if (replyId) {
    const { data: row, error: fetchError } = await fromOwnerTable(
      supabase,
      'support_ticket_messages',
    )
      .select('*')
      .eq('id', replyId)
      .maybeSingle();
    if (fetchError) throw fromSupabaseError(fetchError);
    if (row && isOwnerRow(row)) return mapPortalSupportReply(row);
  }

  const now = new Date().toISOString();
  return {
    id: replyId ?? `ticket-msg-${Date.now()}`,
    ticketId,
    authorId: '',
    body: trimmed,
    isInternal: false,
    createdAt: now,
    updatedAt: now,
  };
}

export const supportRepository = {
  list: listTickets,
  get: getTicket,
  create: createTicket,
  listMessages,
  listStaffTicketMessages,
  replyTicket,
};
