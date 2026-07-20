import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { quotesRepository } from '@/api/repositories/quotesRepository';
import { queryKeys } from '@/lib/queryClient';

export function useQuotes() {
  return useQuery({
    queryKey: queryKeys.quotes,
    queryFn: () => quotesRepository.list(),
  });
}

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.quote(id) : ['quotes', 'missing'],
    queryFn: () => quotesRepository.get(id!),
    enabled: Boolean(id),
  });
}

export function useAcceptQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => quotesRepository.accept(id),
    onSuccess: (quote) => {
      void qc.invalidateQueries({ queryKey: queryKeys.quotes });
      void qc.invalidateQueries({ queryKey: queryKeys.quote(quote.id) });
    },
  });
}

export function useRejectQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      quotesRepository.reject(id, reason),
    onSuccess: (quote) => {
      void qc.invalidateQueries({ queryKey: queryKeys.quotes });
      void qc.invalidateQueries({ queryKey: queryKeys.quote(quote.id) });
    },
  });
}
