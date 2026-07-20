import { getCustomerDashboard as getProjectsCustomerDashboard } from '@/api/repositories/projectsRepository';
import type { CustomerDashboard } from '@/types/domain';

export async function getCustomerDashboard(welcomeName?: string): Promise<CustomerDashboard> {
  return getProjectsCustomerDashboard(welcomeName);
}

export const customerRepository = {
  dashboard: getCustomerDashboard,
  getCustomerDashboard,
};
