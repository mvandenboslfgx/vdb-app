import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { customerRepository, projectsRepository } from '@/api/repositories';

export function useCustomerDashboard() {
  return useQuery({
    queryKey: ['customer', 'dashboard'],
    queryFn: () => customerRepository.dashboard(),
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ['customer', 'projects'],
    queryFn: () => projectsRepository.list(),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['customer', 'projects', id],
    queryFn: () => projectsRepository.get(id),
    enabled: Boolean(id),
  });
}

export function useRequestProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsRepository.request,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['customer', 'projects'] });
      await qc.invalidateQueries({ queryKey: ['customer', 'dashboard'] });
    },
  });
}
