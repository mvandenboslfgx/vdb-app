import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminRepository } from '@/api/repositories';

export function useAdminStats() {
  return useQuery({ queryKey: ['admin', 'stats'], queryFn: adminRepository.stats });
}

export function usePartnerApprovals() {
  return useQuery({
    queryKey: ['admin', 'approvals'],
    queryFn: adminRepository.partnerApplications,
  });
}

export function useReviewPartnerApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approve' | 'reject' }) =>
      adminRepository.reviewPartnerApplication(id, decision),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'approvals'] });
      await qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

export function useAdminTickets() {
  return useQuery({ queryKey: ['admin', 'tickets'], queryFn: adminRepository.listTickets });
}

export function useAdminFinance() {
  return useQuery({
    queryKey: ['admin', 'finance'],
    queryFn: adminRepository.listCommissions,
  });
}

export function useMarkFinanceReviewed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminRepository.markFinanceReviewed,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'finance'] });
      await qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}
