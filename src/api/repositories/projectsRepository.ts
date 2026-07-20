import { buildCustomerDashboard, mockStore } from '@/api/mockData';
import { listAppointments } from '@/api/repositories/appointmentsRepository';
import { listDocuments } from '@/api/repositories/documentsRepository';
import { listInvoices } from '@/api/repositories/invoicesRepository';
import { listConversations } from '@/api/repositories/messagesRepository';
import { listQuotes } from '@/api/repositories/quotesRepository';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import { mapProject, mapProjectMilestone, mapProjectUpdate } from '@/lib/mappers';
import type {
  CustomerDashboard,
  Project,
  ProjectMilestone,
  ProjectUpdate,
} from '@/types/domain';

export async function listProjects(): Promise<Project[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.projects];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).map(mapProject);
}

export async function getProject(id: string): Promise<Project | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.projects.find((p) => p.id === id) ?? null;
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  if (error) throw fromSupabaseError(error);
  return data ? mapProject(data) : null;
}

export async function listMilestones(projectId: string): Promise<ProjectMilestone[]> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.milestones.filter((m) => m.projectId === projectId);
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .from('project_milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order');
  if (error) throw fromSupabaseError(error);
  return (data ?? []).map(mapProjectMilestone);
}

export async function listUpdates(projectId: string): Promise<ProjectUpdate[]> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.updates.filter((u) => u.projectId === projectId);
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .from('project_updates')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_customer_visible', true)
    .order('created_at', { ascending: false });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).map((row) => mapProjectUpdate(row));
}

export async function getCustomerDashboard(welcomeName?: string): Promise<CustomerDashboard> {
  if (shouldUseMockApi()) {
    await delay();
    return buildCustomerDashboard(welcomeName);
  }

  // Live mode composes the dashboard from the real repositories instead of
  // spreading demo data on top of real projects.
  const [projects, quotes, invoices, conversations, appointments, documents] = await Promise.all([
    listProjects(),
    listQuotes(),
    listInvoices(),
    listConversations(),
    listAppointments(),
    listDocuments(),
  ]);

  return {
    welcomeName: welcomeName ?? '',
    activeProjects: projects.filter((p) => !['completed', 'cancelled'].includes(p.status)),
    openQuotes: quotes.filter((q) => q.status === 'sent' || q.status === 'viewed'),
    openInvoices: invoices.filter((i) =>
      ['sent', 'viewed', 'partially_paid', 'overdue'].includes(i.status),
    ),
    unreadMessages: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    upcomingAppointments: appointments.filter((a) =>
      ['requested', 'confirmed', 'rescheduled'].includes(a.status),
    ),
    documentsPendingReview: documents.filter((d) => d.status === 'under_review').length,
  };
}

export async function requestProject(input: {
  title: string;
  description: string;
}): Promise<Project> {
  if (shouldUseMockApi()) {
    await delay();
    const project: Project = {
      id: `proj-${Date.now()}`,
      title: input.title.trim(),
      description: input.description.trim(),
      status: 'request_received',
      customerId: 'demo-user',
      progressPercent: 0,
      nextMilestone: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockStore.projects.unshift(project);
    return project;
  }

  const supabase = requireLiveSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw DomainError.unauthorized('You must be signed in to request a project.');
  }
  const { data, error } = await supabase
    .from('projects')
    .insert({
      title: input.title.trim(),
      description: input.description.trim(),
      status: 'request_received',
      customer_user_id: userData.user.id,
    })
    .select('*')
    .single();
  if (error) throw fromSupabaseError(error);
  return mapProject(data);
}

export const projectsRepository = {
  list: listProjects,
  get: getProject,
  listMilestones,
  listUpdates,
  getCustomerDashboard,
  request: requestProject,
};
