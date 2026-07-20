import { mockStore } from '@/api/mockData';
import { delay, shouldUseMockApi } from '@/api/repositories/_utils';
import { getSupabase } from '@/lib/supabase';
import type { SupportTicket } from '@/types/domain';
import type { SupportTicketInput } from '@/validation/support';

export async function listTickets(): Promise<SupportTicket[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.tickets];
  }
  const supabase = getSupabase();
  if (!supabase) return [...mockStore.tickets];
  const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', {
    ascending: false,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as SupportTicket[];
}

export async function getTicket(id: string): Promise<SupportTicket | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.tickets.find((t) => t.id === id) ?? null;
  }
  const supabase = getSupabase();
  if (!supabase) return mockStore.tickets.find((t) => t.id === id) ?? null;
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as SupportTicket | null;
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

  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      subject: input.subject,
      category: input.category,
      priority: input.priority,
      description: input.description,
      project_id: input.projectId || null,
      status: 'new',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as SupportTicket;
}

export const supportRepository = {
  list: listTickets,
  get: getTicket,
  create: createTicket,
};
