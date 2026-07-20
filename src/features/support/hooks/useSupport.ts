import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supportRepository } from '@/api/repositories/supportRepository';
import { queryKeys } from '@/lib/queryClient';
import type { SupportTicketInput } from '@/validation/support';

export function useTickets() {
  return useQuery({
    queryKey: queryKeys.tickets,
    queryFn: () => supportRepository.list(),
  });
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.ticket(id) : ['tickets', 'missing'],
    queryFn: () => supportRepository.get(id!),
    enabled: Boolean(id),
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SupportTicketInput) => supportRepository.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tickets });
    },
  });
}
