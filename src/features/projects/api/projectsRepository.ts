import { delay, mockProjects } from '@/features/_shared/mockData';
import { shouldUseMockRepositories } from '@/features/_shared/repository';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import { mapProject } from '@/lib/mappers';
import { requireSupabase } from '@/lib/supabase';
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

class SupabaseProjectsRepository implements ProjectsRepository {
  async list(): Promise<Project[]> {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw fromSupabaseError(error);
    return (data ?? []).map(mapProject);
  }

  async getById(id: string): Promise<Project | null> {
    const supabase = requireSupabase();
    const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
    if (error) throw fromSupabaseError(error);
    return data ? mapProject(data) : null;
  }

  async createRequest(input: ProjectRequestInput): Promise<Project> {
    const supabase = requireSupabase();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw DomainError.unauthorized('You must be signed in to request a project.');
    }
    const { data, error } = await supabase
      .from('projects')
      .insert({
        title: input.title,
        description: input.description,
        status: 'request_received',
        customer_user_id: userData.user.id,
      })
      .select('*')
      .single();
    if (error) throw fromSupabaseError(error);
    return mapProject(data);
  }
}

export function createProjectsRepository(): ProjectsRepository {
  return shouldUseMockRepositories()
    ? new MockProjectsRepository()
    : new SupabaseProjectsRepository();
}
