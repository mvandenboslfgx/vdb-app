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

export interface AcceptQuoteInput {
  quoteId: string;
  /** Legacy alias kept for backwards-compatible callers; superseded by termsVersionId. */
  acceptTerms?: boolean;
  /** Explicit customer confirmation. Defaults to true: the UI's Accept button
   * tap already *is* the confirmation gesture, so single-argument callers
   * (`acceptQuote(id)`) do not need to pass this explicitly. The server RPC
   * still independently enforces `p_confirmation = true`. */
  confirmation?: boolean;
  /** Optional terms-of-service version being accepted alongside the quote. */
  termsVersionId?: string;
}

/**
 * Accept a quote via the `accept_quote` SECURITY DEFINER RPC. The database is
 * the source of truth for ownership, status transitions, expiry, and
 * duplicate-acceptance checks -- this repository never mutates `quotes`
 * directly for accept/reject.
 */
export async function acceptQuote(idOrInput: string | AcceptQuoteInput): Promise<Quote> {
  const input: AcceptQuoteInput =
    typeof idOrInput === 'string' ? { quoteId: idOrInput } : idOrInput;

  if (shouldUseMockApi()) {
    await delay();
    const quote = mockStore.quotes.find((q) => q.id === input.quoteId);
    if (!quote) throw DomainError.notFound('Quote not found');
    quote.status = 'accepted';
    quote.updatedAt = new Date().toISOString();
    return { ...quote };
  }

  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .rpc('accept_quote', {
      p_quote_id: input.quoteId,
      p_terms_version_id: input.termsVersionId ?? undefined,
      p_confirmation: input.confirmation ?? true,
    });
  if (error) throw fromSupabaseError(error);

  const itemsByQuote = await fetchItems(supabase, [data.id]);
  return mapQuote(data, itemsByQuote.get(data.id) ?? []);
}

export interface RejectQuoteInput {
  quoteId: string;
  reason?: string;
}

export async function rejectQuote(
  idOrInput: string | RejectQuoteInput,
  reason = '',
): Promise<Quote> {
  const input: RejectQuoteInput =
    typeof idOrInput === 'string' ? { quoteId: idOrInput, reason } : idOrInput;

  if (shouldUseMockApi()) {
    await delay();
    const quote = mockStore.quotes.find((q) => q.id === input.quoteId);
    if (!quote) throw DomainError.notFound('Quote not found');
    quote.status = 'rejected';
    quote.updatedAt = new Date().toISOString();
    return { ...quote };
  }

  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .rpc('reject_quote', {
      p_quote_id: input.quoteId,
      p_reason: input.reason || undefined,
    });
  if (error) throw fromSupabaseError(error);

  const itemsByQuote = await fetchItems(supabase, [data.id]);
  return mapQuote(data, itemsByQuote.get(data.id) ?? []);
}

export const quotesRepository = {
  list: listQuotes,
  get: getQuote,
  accept: acceptQuote,
  reject: rejectQuote,
};
