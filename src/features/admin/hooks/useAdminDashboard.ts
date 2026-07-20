import { useQuery } from '@tanstack/react-query';

import { createAdminRepository } from '@/features/admin/api/adminRepository';
import { queryKeys } from '@/lib/queryClient';

const repo = createAdminRepository();

export function useAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.adminDashboard,
    queryFn: () => repo.getDashboard(),
  });
}
