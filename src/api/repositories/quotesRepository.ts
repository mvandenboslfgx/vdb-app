import { mockStore } from '@/api/mockData';
import { delay, shouldUseMockApi } from '@/api/repositories/_utils';
import { getSupabase } from '@/lib/supabase';
import type { Quote, QuoteStatus } from '@/types/domain';

export async function listQuotes(): Promise<Quote[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.quotes];
  }
  const supabase = getSupabase();
  if (!supabase) return [...mockStore.quotes];
  const { data, error } = await supabase.from('quotes').select('*').order('created_at', {
    ascending: false,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as Quote[];
}

export async function getQuote(id: string): Promise<Quote | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.quotes.find((q) => q.id === id) ?? null;
  }
  const supabase = getSupabase();
  if (!supabase) return mockStore.quotes.find((q) => q.id === id) ?? null;
  const { data, error } = await supabase.from('quotes').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Quote | null;
}

async function setQuoteStatus(id: string, status: QuoteStatus): Promise<Quote> {
  if (shouldUseMockApi()) {
    await delay();
    const quote = mockStore.quotes.find((q) => q.id === id);
    if (!quote) throw new Error('Quote not found');
    quote.status = status;
    quote.updatedAt = new Date().toISOString();
    return { ...quote };
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('quotes')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Quote;
}

export async function acceptQuote(
  idOrInput: string | { quoteId: string; acceptTerms?: boolean; confirmation?: boolean },
): Promise<Quote> {
  const id = typeof idOrInput === 'string' ? idOrInput : idOrInput.quoteId;
  return setQuoteStatus(id, 'accepted');
}

export async function rejectQuote(
  idOrInput: string | { quoteId: string; reason?: string },
  reason = '',
): Promise<Quote> {
  if (typeof idOrInput === 'string') {
    return setQuoteStatus(idOrInput, 'rejected');
  }
  void reason;
  void idOrInput.reason;
  return setQuoteStatus(idOrInput.quoteId, 'rejected');
}

export const quotesRepository = {
  list: listQuotes,
  get: getQuote,
  accept: acceptQuote,
  reject: rejectQuote,
};
