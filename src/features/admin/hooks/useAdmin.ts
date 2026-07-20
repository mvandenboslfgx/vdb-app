import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminRepository } from '@/api/repositories/adminRepository';
import { queryKeys } from '@/lib/queryClient';

export function useAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.adminDashboard,
    queryFn: () => adminRepository.getDashboard(),
  });
}

export function useAdminQueue() {
  return useQuery({
    queryKey: [...queryKeys.adminDashboard, 'queue'],
    queryFn: () => adminRepository.listQueue(),
  });
}

export function useApprovePartnerApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminRepository.approvePartnerApplication(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.adminDashboard });
    },
  });
}
