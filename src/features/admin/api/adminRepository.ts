import { delay, getMockAdminStats } from '@/features/_shared/mockData';
import type { AdminDashboardStats } from '@/types';

export interface AdminRepository {
  getDashboard(): Promise<AdminDashboardStats>;
}

class MockAdminRepository implements AdminRepository {
  async getDashboard(): Promise<AdminDashboardStats> {
    await delay();
    return getMockAdminStats();
  }
}

export function createAdminRepository(): AdminRepository {
  return new MockAdminRepository();
}
