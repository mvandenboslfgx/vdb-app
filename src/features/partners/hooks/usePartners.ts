import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { partnersRepository } from '@/api/repositories/partnersRepository';
import { queryKeys } from '@/lib/queryClient';
import type { PartnerApplicationInput } from '@/validation/partner';

export function usePartnerProfile() {
  return useQuery({
    queryKey: queryKeys.partnerDashboard,
    queryFn: () => partnersRepository.getProfile(),
  });
}

export function useLeads() {
  return useQuery({
    queryKey: queryKeys.leads,
    queryFn: () => partnersRepository.listLeads(),
  });
}

export function useSubmitPartnerApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PartnerApplicationInput) => partnersRepository.submitApplication(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.partnerDashboard });
    },
  });
}
