import { delay, mockInvoices } from '@/features/_shared/mockData';
import type { Invoice } from '@/types';

export interface InvoicesRepository {
  list(): Promise<Invoice[]>;
  getById(id: string): Promise<Invoice | null>;
}

class MockInvoicesRepository implements InvoicesRepository {
  async list(): Promise<Invoice[]> {
    await delay();
    return [...mockInvoices];
  }

  async getById(id: string): Promise<Invoice | null> {
    await delay();
    return mockInvoices.find((invoice) => invoice.id === id) ?? null;
  }
}

export function createInvoicesRepository(): InvoicesRepository {
  return new MockInvoicesRepository();
}
