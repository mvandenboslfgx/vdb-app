import { mockStore } from '@/api/mockData';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { createCheckout } from '@/api/repositories/paymentsRepository';
import { fromSupabaseError } from '@/lib/errors';
import { mapInvoice } from '@/lib/mappers';
import type { Invoice, ProductCategory } from '@/types/domain';

export async function listInvoices(): Promise<Invoice[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.invoices];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.from('invoices').select('*').order('issued_on', {
    ascending: false,
  });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).map(mapInvoice);
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.invoices.find((i) => i.id === id) ?? null;
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
  if (error) throw fromSupabaseError(error);
  return data ? mapInvoice(data) : null;
}

export async function startCheckout(input: {
  invoiceId: string;
  amountCents?: number;
  category?: ProductCategory;
  productCategory?: ProductCategory;
  platform?: 'ios' | 'android' | 'web';
}) {
  return createCheckout(input);
}

export const invoicesRepository = {
  list: listInvoices,
  get: getInvoice,
  startCheckout,
};
