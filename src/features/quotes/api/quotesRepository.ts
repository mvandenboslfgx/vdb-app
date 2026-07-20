import { delay, mockQuotes } from '@/features/_shared/mockData';
import type { Quote } from '@/types';
import type { QuoteAcceptInput } from '@/validation';

export interface QuotesRepository {
  list(): Promise<Quote[]>;
  getById(id: string): Promise<Quote | null>;
  accept(input: QuoteAcceptInput): Promise<Quote>;
  reject(id: string, reason?: string): Promise<Quote>;
}

class MockQuotesRepository implements QuotesRepository {
  async list(): Promise<Quote[]> {
    await delay();
    return [...mockQuotes];
  }

  async getById(id: string): Promise<Quote | null> {
    await delay();
    return mockQuotes.find((quote) => quote.id === id) ?? null;
  }

  async accept(input: QuoteAcceptInput): Promise<Quote> {
    await delay();
    const quote = mockQuotes.find((item) => item.id === input.quoteId);
    if (!quote) throw new Error('quote_not_found');
    quote.status = 'accepted';
    quote.updatedAt = new Date().toISOString();
    return quote;
  }

  async reject(id: string): Promise<Quote> {
    await delay();
    const quote = mockQuotes.find((item) => item.id === id);
    if (!quote) throw new Error('quote_not_found');
    quote.status = 'rejected';
    quote.updatedAt = new Date().toISOString();
    return quote;
  }
}

export function createQuotesRepository(): QuotesRepository {
  return new MockQuotesRepository();
}
