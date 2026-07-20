import { mockStore } from '@/api/mockData';
import { delay, shouldUseMockApi } from '@/api/repositories/_utils';
import { createCheckout } from '@/api/repositories/paymentsRepository';
import { getSupabase } from '@/lib/supabase';
import type { Invoice, ProductCategory } from '@/types/domain';

export async function listInvoices(): Promise<Invoice[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.invoices];
  }
  const supabase = getSupabase();
  if (!supabase) return [...mockStore.invoices];
  const { data, error } = await supabase.from('invoices').select('*').order('issue_date', {
    ascending: false,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as Invoice[];
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.invoices.find((i) => i.id === id) ?? null;
  }
  const supabase = getSupabase();
  if (!supabase) return mockStore.invoices.find((i) => i.id === id) ?? null;
  const { data, error } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Invoice | null;
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
