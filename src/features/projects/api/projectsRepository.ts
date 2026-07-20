import { delay, mockProjects } from '@/features/_shared/mockData';
import { shouldUseMockRepositories } from '@/features/_shared/repository';
import { getSupabase } from '@/lib/supabase';
import type { Project } from '@/types';
import type { ProjectRequestInput } from '@/validation';

export interface ProjectsRepository {
  list(): Promise<Project[]>;
  getById(id: string): Promise<Project | null>;
  createRequest(input: ProjectRequestInput): Promise<Project>;
}

class MockProjectsRepository implements ProjectsRepository {
  async list(): Promise<Project[]> {
    await delay();
    return [...mockProjects];
  }

  async getById(id: string): Promise<Project | null> {
    await delay();
    return mockProjects.find((project) => project.id === id) ?? null;
  }

  async createRequest(input: ProjectRequestInput): Promise<Project> {
    await delay();
    const project: Project = {
      id: `proj-${Date.now()}`,
      title: input.title,
      description: input.description,
      status: 'request_received',
      customerId: 'mock-user-1',
      progressPercent: 0,
      nextMilestone: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockProjects.unshift(project);
    return project;
  }
}

function mapProject(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    status: (row.status as Project['status']) ?? 'request_received',
    customerId: String(row.customer_id ?? ''),
    progressPercent: Number(row.progress_percent ?? 0),
    nextMilestone: (row.next_milestone as string | null) ?? null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

class SupabaseProjectsRepository implements ProjectsRepository {
  async list(): Promise<Project[]> {
    const supabase = getSupabase();
    if (!supabase) return new MockProjectsRepository().list();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => mapProject(row as Record<string, unknown>));
  }

  async getById(id: string): Promise<Project | null> {
    const supabase = getSupabase();
    if (!supabase) return new MockProjectsRepository().getById(id);
    const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapProject(data as Record<string, unknown>) : null;
  }

  async createRequest(input: ProjectRequestInput): Promise<Project> {
    const supabase = getSupabase();
    if (!supabase) return new MockProjectsRepository().createRequest(input);
    const { data, error } = await supabase
      .from('projects')
      .insert({
        title: input.title,
        description: input.description,
        status: 'request_received',
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapProject(data as Record<string, unknown>);
  }
}

export function createProjectsRepository(): ProjectsRepository {
  return shouldUseMockRepositories()
    ? new MockProjectsRepository()
    : new SupabaseProjectsRepository();
}
