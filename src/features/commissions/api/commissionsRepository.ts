import { delay, mockCommissions } from '@/features/_shared/mockData';
import { isFeatureEnabled } from '@/security/featureFlags';
import type { Commission } from '@/types';

export interface CommissionsRepository {
  list(): Promise<Commission[]>;
  requestPayout(): Promise<{ allowed: boolean; reason: string }>;
}

class MockCommissionsRepository implements CommissionsRepository {
  async list(): Promise<Commission[]> {
    await delay();
    return [...mockCommissions];
  }

  async requestPayout(): Promise<{ allowed: boolean; reason: string }> {
    await delay();
    if (!isFeatureEnabled('partnerPayouts')) {
      return { allowed: false, reason: 'partner_payouts_disabled' };
    }
    return { allowed: false, reason: 'server_payout_unavailable' };
  }
}

export function createCommissionsRepository(): CommissionsRepository {
  return new MockCommissionsRepository();
}
