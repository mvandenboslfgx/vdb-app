import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { accountRepository, partnerRepository } from '@/api/repositories';

export function useLeads() {
  return useQuery({ queryKey: ['partner', 'leads'], queryFn: partnerRepository.listLeads });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: partnerRepository.createLead,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['partner', 'leads'] });
    },
  });
}

export function useCommissions() {
  return useQuery({
    queryKey: ['partner', 'commissions'],
    queryFn: partnerRepository.listCommissions,
  });
}

export function usePartnerLink() {
  return useQuery({ queryKey: ['partner', 'link'], queryFn: partnerRepository.partnerLink });
}

export function useRequestPayout() {
  return useMutation({
    mutationFn: (commissionIds?: string[]) =>
      partnerRepository.requestPayout(commissionIds ?? []),
  });
}

export function usePartnerApply() {
  return useMutation({ mutationFn: partnerRepository.apply });
}

export function useAccountDeletion() {
  return useMutation({ mutationFn: accountRepository.requestDeletion });
}

export function useSubmitReview() {
  return useMutation({ mutationFn: accountRepository.submitReview });
}
