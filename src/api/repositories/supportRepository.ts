import { mockStore } from '@/api/mockData';
import { delay, shouldUseMockApi } from '@/api/repositories/_utils';
import { DomainError } from '@/lib/errors';
import type { SupportTicket, SupportTicketMessage } from '@/types/domain';
import type { SupportTicketInput } from '@/validation/support';

export async function listTickets(): Promise<SupportTicket[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.tickets];
  }
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:support_tickets');
}

export async function getTicket(id: string): Promise<SupportTicket | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.tickets.find((t) => t.id === id) ?? null;
  }
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:support_tickets');
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

  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:support_tickets');
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
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:support_ticket_messages');
}

export const supportRepository = {
  list: listTickets,
  get: getTicket,
  create: createTicket,
  listMessages,
};
