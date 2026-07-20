import { delay, mockTickets } from '@/features/_shared/mockData';
import type { SupportTicket } from '@/types';
import type { SupportTicketInput } from '@/validation';

export interface SupportRepository {
  list(): Promise<SupportTicket[]>;
  getById(id: string): Promise<SupportTicket | null>;
  create(input: SupportTicketInput): Promise<SupportTicket>;
}

class MockSupportRepository implements SupportRepository {
  async list(): Promise<SupportTicket[]> {
    await delay();
    return [...mockTickets];
  }

  async getById(id: string): Promise<SupportTicket | null> {
    await delay();
    return mockTickets.find((ticket) => ticket.id === id) ?? null;
  }

  async create(input: SupportTicketInput): Promise<SupportTicket> {
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
    mockTickets.unshift(ticket);
    return ticket;
  }
}

export function createSupportRepository(): SupportRepository {
  return new MockSupportRepository();
}
