/**
 * Ticket clickability — role/route gating for support surfaces (not full E2E).
 */
import {
  canAccessAdminArea,
  canAccessPartnerArea,
  resolveHomeRoute,
  resolvePrimaryArea,
  type AppRole,
} from '@/security/roles';
import { isFeatureEnabled } from '@/security/featureFlags';
import { BACKEND_CONTRACT } from '@/config/backendContract';
import backendContract from '../../contracts/backend-contract.json';

describe('ticket clickability - role surfaces', () => {
  it('customer home is customer area (support under customer stack)', () => {
    const roles: AppRole[] = ['customer'];
    expect(resolveHomeRoute(roles)).toBe('/(customer)');
    expect(resolvePrimaryArea(roles)).toBe('customer');
    expect(canAccessAdminArea(roles)).toBe(false);
    expect(canAccessPartnerArea(roles)).toBe(false);
  });

  it('partner does not get admin ticket surfaces via role gating', () => {
    const roles: AppRole[] = ['partner'];
    expect(canAccessAdminArea(roles)).toBe(false);
    expect(resolvePrimaryArea(roles)).toBe('partner');
  });

  it('admin/owner resolve to admin area for ticket tabs', () => {
    for (const role of ['admin', 'owner'] as const) {
      const roles: AppRole[] = [role];
      expect(canAccessAdminArea(roles)).toBe(true);
      expect(resolvePrimaryArea(roles)).toBe('admin');
    }
  });

  it('keeps support_internal_notes_rpc fail-closed in the consumer contract pin', () => {
    expect(BACKEND_CONTRACT.version).toBe('0.2.0-rc.6');
    expect(backendContract.featureFlags.support_internal_notes_rpc).toBe(false);
    expect(isFeatureEnabled('mollieCheckout')).toBe(false);
  });
});
