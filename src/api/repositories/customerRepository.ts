import { buildCustomerDashboard } from '@/api/mockData';
import type { CustomerDashboard } from '@/types/domain';

export async function getCustomerDashboard(
  welcomeName?: string,
): Promise<CustomerDashboard> {
  return buildCustomerDashboard(welcomeName);
}

export const customerRepository = {
  dashboard: getCustomerDashboard,
  getCustomerDashboard,
};
