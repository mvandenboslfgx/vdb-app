import { useQuery } from '@tanstack/react-query';

import { invoicesRepository } from '@/api/repositories/invoicesRepository';
import { queryKeys } from '@/lib/queryClient';

export function useInvoices() {
  return useQuery({
    queryKey: queryKeys.invoices,
    queryFn: () => invoicesRepository.list(),
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.invoice(id) : ['invoices', 'missing'],
    queryFn: () => invoicesRepository.get(id!),
    enabled: Boolean(id),
  });
}
