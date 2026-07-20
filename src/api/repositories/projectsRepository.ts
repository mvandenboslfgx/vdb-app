import { buildCustomerDashboard, mockStore } from '@/api/mockData';
import { delay, shouldUseMockApi } from '@/api/repositories/_utils';
import { getSupabase } from '@/lib/supabase';
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
  const supabase = getSupabase();
  if (!supabase) return [...mockStore.projects];
  const { data, error } = await supabase.from('projects').select('*').order('updated_at', {
    ascending: false,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.projects.find((p) => p.id === id) ?? null;
  }
  const supabase = getSupabase();
  if (!supabase) return mockStore.projects.find((p) => p.id === id) ?? null;
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Project | null;
}

export async function listMilestones(projectId: string): Promise<ProjectMilestone[]> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.milestones.filter((m) => m.projectId === projectId);
  }
  const supabase = getSupabase();
  if (!supabase) return mockStore.milestones.filter((m) => m.projectId === projectId);
  const { data, error } = await supabase
    .from('project_milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as ProjectMilestone[];
}

export async function listUpdates(projectId: string): Promise<ProjectUpdate[]> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.updates.filter((u) => u.projectId === projectId);
  }
  const supabase = getSupabase();
  if (!supabase) return mockStore.updates.filter((u) => u.projectId === projectId);
  const { data, error } = await supabase
    .from('project_updates')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProjectUpdate[];
}

export async function getCustomerDashboard(welcomeName?: string): Promise<CustomerDashboard> {
  if (shouldUseMockApi()) {
    await delay();
    return buildCustomerDashboard(welcomeName);
  }
  const projects = await listProjects();
  return {
    ...buildCustomerDashboard(welcomeName),
    activeProjects: projects.filter((p) => !['completed', 'cancelled'].includes(p.status)),
  };
}

export async function requestProject(input: {
  title: string;
  description: string;
}): Promise<Project> {
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
  if (shouldUseMockApi()) {
    await delay();
    mockStore.projects.unshift(project);
    return project;
  }
  mockStore.projects.unshift(project);
  return project;
}

export const projectsRepository = {
  list: listProjects,
  get: getProject,
  listMilestones,
  listUpdates,
  getCustomerDashboard,
  request: requestProject,
};
