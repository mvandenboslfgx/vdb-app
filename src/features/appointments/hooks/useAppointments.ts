import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { appointmentsRepository } from '@/api/repositories/appointmentsRepository';
import { queryKeys } from '@/lib/queryClient';

export function useAppointments() {
  return useQuery({
    queryKey: queryKeys.appointments,
    queryFn: () => appointmentsRepository.list(),
  });
}

export function useRequestAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      title: string;
      startsAt: string;
      endsAt: string;
      location?: string | null;
    }) => appointmentsRepository.request(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.appointments });
    },
  });
}
