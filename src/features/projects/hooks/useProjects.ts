import { useQuery, useQueryClient } from '@tanstack/react-query';

import { projectsRepository } from '@/api/repositories/projectsRepository';
import { queryKeys } from '@/lib/queryClient';

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => projectsRepository.list(),
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.project(id) : ['projects', 'missing'],
    queryFn: () => projectsRepository.get(id!),
    enabled: Boolean(id),
  });
}

export function useProjectMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? [...queryKeys.project(projectId), 'milestones'] : ['milestones'],
    queryFn: () => projectsRepository.listMilestones(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useProjectUpdates(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? [...queryKeys.project(projectId), 'updates'] : ['updates'],
    queryFn: () => projectsRepository.listUpdates(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useCustomerDashboard(welcomeName?: string) {
  return useQuery({
    queryKey: [...queryKeys.customerDashboard, welcomeName ?? ''],
    queryFn: () => projectsRepository.getCustomerDashboard(welcomeName),
  });
}

export function useRefreshProjects() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.projects });
}
