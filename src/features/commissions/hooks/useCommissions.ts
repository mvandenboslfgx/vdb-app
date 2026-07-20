import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { commissionsRepository } from '@/api/repositories/commissionsRepository';
import { queryKeys } from '@/lib/queryClient';

export function useCommissions() {
  return useQuery({
    queryKey: queryKeys.commissions,
    queryFn: () => commissionsRepository.list(),
  });
}

export function useRequestPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commissionIds?: string[]) =>
      commissionsRepository.requestPayout(commissionIds ?? []),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.commissions });
    },
  });
}
