import { useQuery } from '@tanstack/react-query';

import { createCustomerRepository } from '@/features/customer/api/customerRepository';
import { queryKeys } from '@/lib/queryClient';
import { useAuth } from '@/providers/AuthProvider';

const repo = createCustomerRepository();

export function useCustomerDashboard() {
  const { profile } = useAuth();
  const name = profile?.fullName ?? '…';

  return useQuery({
    queryKey: [...queryKeys.customerDashboard, name],
    queryFn: () => repo.getDashboard(name),
  });
}
