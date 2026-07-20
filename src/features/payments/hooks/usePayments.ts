import { useMutation, useQuery } from '@tanstack/react-query';

import {
  paymentsRepository,
  type CreateCheckoutInput,
} from '@/api/repositories/paymentsRepository';

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: () => paymentsRepository.list(),
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (input: CreateCheckoutInput) => paymentsRepository.createCheckout(input),
  });
}
