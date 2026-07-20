import { delay, getMockCustomerDashboard } from '@/features/_shared/mockData';
import type { CustomerDashboard } from '@/types';

export interface CustomerRepository {
  getDashboard(name: string): Promise<CustomerDashboard>;
}

class MockCustomerRepository implements CustomerRepository {
  async getDashboard(name: string): Promise<CustomerDashboard> {
    await delay();
    return getMockCustomerDashboard(name);
  }
}

export function createCustomerRepository(): CustomerRepository {
  return new MockCustomerRepository();
}
