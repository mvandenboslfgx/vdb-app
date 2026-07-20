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

export function usePayableBalance() {
  return useQuery({
    queryKey: ['partner', 'payableBalance'],
    queryFn: partnerRepository.getPayableBalance,
  });
}

export function usePayoutRequests() {
  return useQuery({
    queryKey: ['partner', 'payoutRequests'],
    queryFn: partnerRepository.listPayoutRequests,
  });
}

export function useRequestPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commissionIds, amountCents }: { commissionIds?: string[]; amountCents?: number } = {}) =>
      partnerRepository.requestPayout(commissionIds ?? [], amountCents),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['partner', 'commissions'] }),
        qc.invalidateQueries({ queryKey: ['partner', 'payableBalance'] }),
        qc.invalidateQueries({ queryKey: ['partner', 'payoutRequests'] }),
      ]);
    },
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
