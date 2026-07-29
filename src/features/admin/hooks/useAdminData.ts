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

export function useAdminPayoutRequests(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'payoutRequests'],
    queryFn: adminRepository.listPayoutRequests,
    enabled: options?.enabled ?? true,
  });
}

function useInvalidateFinance() {
  const qc = useQueryClient();
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['admin', 'finance'] }),
      qc.invalidateQueries({ queryKey: ['admin', 'payoutRequests'] }),
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] }),
    ]);
  };
}

export function useApproveCommission() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminRepository.approveCommission(id, reason),
    onSuccess: invalidate,
  });
}

export function useRejectCommission() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminRepository.rejectCommission(id, reason),
    onSuccess: invalidate,
  });
}

export function useProcessPayoutRequest() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminRepository.processPayoutRequest(id, reason),
    onSuccess: invalidate,
  });
}

export function useRejectPayoutRequest() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminRepository.rejectPayoutRequest(id, reason),
    onSuccess: invalidate,
  });
}
