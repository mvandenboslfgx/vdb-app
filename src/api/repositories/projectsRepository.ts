import { buildCustomerDashboard, mockStore } from '@/api/mockData';
import { listAppointments } from '@/api/repositories/appointmentsRepository';
import { listDocuments } from '@/api/repositories/documentsRepository';
import { listInvoices } from '@/api/repositories/invoicesRepository';
import { listConversations } from '@/api/repositories/messagesRepository';
import { listQuotes } from '@/api/repositories/quotesRepository';
import { fromOwnerTable, isContractSurfaceUnavailable } from '@/api/contract/ownerClient';
import { mapPortalProject } from '@/api/contract/portalMappers';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import type { CustomerDashboard, Project, ProjectMilestone, ProjectUpdate } from '@/types/domain';

export async function listProjects(): Promise<Project[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.projects];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await fromOwnerTable(supabase, 'projects')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).map(mapPortalProject);
}

export async function getProject(id: string): Promise<Project | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.projects.find((p) => p.id === id) ?? null;
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await fromOwnerTable(supabase, 'projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw fromSupabaseError(error);
  return data ? mapPortalProject(data) : null;
}

export async function listMilestones(projectId: string): Promise<ProjectMilestone[]> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.milestones.filter((m) => m.projectId === projectId);
  }
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:project_milestones');
}

export async function listUpdates(projectId: string): Promise<ProjectUpdate[]> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.updates.filter((u) => u.projectId === projectId);
  }
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:project_updates');
}

export async function loadOptionalDashboardSurface<T>(
  load: () => Promise<T>,
  fallback: T,
): Promise<{ data: T; unavailable: boolean }> {
  try {
    return { data: await load(), unavailable: false };
  } catch (error) {
    if (isContractSurfaceUnavailable(error)) {
      return { data: fallback, unavailable: true };
    }
    throw error;
  }
}

export async function getCustomerDashboard(welcomeName?: string): Promise<CustomerDashboard> {
  if (shouldUseMockApi()) {
    await delay();
    return buildCustomerDashboard(welcomeName);
  }

  const [projects, quotes, invoices, documents, conversations, appointments] = await Promise.all([
    listProjects(),
    listQuotes(),
    listInvoices(),
    listDocuments(),
    loadOptionalDashboardSurface(listConversations, []),
    loadOptionalDashboardSurface(listAppointments, []),
  ]);

  return {
    welcomeName: welcomeName ?? '',
    activeProjects: projects.filter((p) => !['completed', 'cancelled'].includes(p.status)),
    openQuotes: quotes.filter((q) => q.status === 'sent' || q.status === 'viewed'),
    openInvoices: invoices.filter((i) =>
      ['sent', 'viewed', 'partially_paid', 'overdue'].includes(i.status),
    ),
    unreadMessages: conversations.data.reduce((sum, c) => sum + c.unreadCount, 0),
    upcomingAppointments: appointments.data.filter((a) =>
      ['requested', 'confirmed', 'rescheduled'].includes(a.status),
    ),
    documentsPendingReview: documents.filter((d) => d.status === 'under_review').length,
    unavailableSurfaces: [
      ...(conversations.unavailable ? ['conversations' as const] : []),
      ...(appointments.unavailable ? ['appointments' as const] : []),
    ],
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

  requireLiveSupabase();
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:create_project');
}

export const projectsRepository = {
  list: listProjects,
  get: getProject,
  listMilestones,
  listUpdates,
  getCustomerDashboard,
  request: requestProject,
};
