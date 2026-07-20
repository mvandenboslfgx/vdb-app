import { mockStore } from '@/api/mockData';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import { mapQuote } from '@/lib/mappers';
import type { Tables } from '@/types/database.generated';
import type { Quote } from '@/types/domain';

type QuoteItemRow = Tables<'quote_items'>;

async function fetchItems(
  supabase: ReturnType<typeof requireLiveSupabase>,
  quoteIds: string[],
): Promise<Map<string, QuoteItemRow[]>> {
  const map = new Map<string, QuoteItemRow[]>();
  if (quoteIds.length === 0) return map;
  const { data, error } = await supabase
    .from('quote_items')
    .select('*')
    .in('quote_id', quoteIds)
    .order('sort_order');
  if (error) throw fromSupabaseError(error);
  for (const row of data ?? []) {
    const existing = map.get(row.quote_id) ?? [];
    existing.push(row);
    map.set(row.quote_id, existing);
  }
  return map;
}

export async function listQuotes(): Promise<Quote[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.quotes];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.from('quotes').select('*').order('created_at', {
    ascending: false,
  });
  if (error) throw fromSupabaseError(error);
  const rows = data ?? [];
  const itemsByQuote = await fetchItems(supabase, rows.map((r) => r.id));
  return rows.map((row) => mapQuote(row, itemsByQuote.get(row.id) ?? []));
}

export async function getQuote(id: string): Promise<Quote | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.quotes.find((q) => q.id === id) ?? null;
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.from('quotes').select('*').eq('id', id).maybeSingle();
  if (error) throw fromSupabaseError(error);
  if (!data) return null;
  const itemsByQuote = await fetchItems(supabase, [data.id]);
  return mapQuote(data, itemsByQuote.get(data.id) ?? []);
}

async function setQuoteStatus(id: string, status: 'accepted' | 'rejected'): Promise<Quote> {
  if (shouldUseMockApi()) {
    await delay();
    const quote = mockStore.quotes.find((q) => q.id === id);
    if (!quote) throw DomainError.notFound('Quote not found');
    quote.status = status;
    quote.updatedAt = new Date().toISOString();
    return { ...quote };
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .from('quotes')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw fromSupabaseError(error);
  const itemsByQuote = await fetchItems(supabase, [data.id]);
  return mapQuote(data, itemsByQuote.get(data.id) ?? []);
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
