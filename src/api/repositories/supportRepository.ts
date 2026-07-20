import { mockStore } from '@/api/mockData';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import {
  mapSupportTicket,
  mapSupportTicketMessage,
  mapSupportTicketPriorityToDb,
} from '@/lib/mappers';
import type { SupportTicket, SupportTicketMessage } from '@/types/domain';
import type { SupportTicketInput } from '@/validation/support';

/** support_tickets has no `description` column — the first ticket message carries it. */
async function fetchDescriptions(
  supabase: ReturnType<typeof requireLiveSupabase>,
  ticketIds: string[],
): Promise<Map<string, string>> {
  if (ticketIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('support_ticket_messages')
    .select('ticket_id, body, created_at')
    .in('ticket_id', ticketIds)
    .order('created_at', { ascending: true });
  if (error) throw fromSupabaseError(error);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (!map.has(row.ticket_id)) {
      map.set(row.ticket_id, row.body);
    }
  }
  return map;
}

export async function listTickets(): Promise<SupportTicket[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.tickets];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', {
    ascending: false,
  });
  if (error) throw fromSupabaseError(error);
  const rows = data ?? [];
  const descriptions = await fetchDescriptions(supabase, rows.map((r) => r.id));
  return rows.map((row) => mapSupportTicket(row, descriptions.get(row.id) ?? ''));
}

export async function getTicket(id: string): Promise<SupportTicket | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.tickets.find((t) => t.id === id) ?? null;
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw fromSupabaseError(error);
  if (!data) return null;
  const descriptions = await fetchDescriptions(supabase, [data.id]);
  return mapSupportTicket(data, descriptions.get(data.id) ?? '');
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
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw DomainError.unauthorized('You must be signed in to create a support ticket.');
  }

  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({
      subject: input.subject,
      category: input.category,
      priority: mapSupportTicketPriorityToDb(input.priority),
      project_id: input.projectId || null,
      requester_id: userData.user.id,
      status: 'open',
    })
    .select('*')
    .single();
  if (ticketError) throw fromSupabaseError(ticketError);

  const { error: messageError } = await supabase.from('support_ticket_messages').insert({
    ticket_id: ticket.id,
    author_id: userData.user.id,
    body: input.description,
  });
  if (messageError) throw fromSupabaseError(messageError);

  return mapSupportTicket(ticket, input.description);
}

/**
 * Lists a ticket's messages in chronological order. RLS already hides
 * internal notes from non-staff (see support_ticket_messages_select in
 * 20260720101300_rls_policies.sql) -- this never filters client-side.
 */
export async function listMessages(ticketId: string): Promise<SupportTicketMessage[]> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.ticketMessages.filter((m) => m.ticketId === ticketId);
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .from('support_ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).map(mapSupportTicketMessage);
}

export const supportRepository = {
  list: listTickets,
  get: getTicket,
  create: createTicket,
  listMessages,
};
