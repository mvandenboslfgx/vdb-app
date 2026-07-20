import {
  canAccessAdminArea,
  canAccessPartnerArea,
  isAdmin,
  isPartner,
  resolveHomeRoute,
  resolvePrimaryArea,
} from '@/security/roles';

describe('roles', () => {
  it('resolves admin area for admin/staff', () => {
    expect(resolvePrimaryArea(['admin'])).toBe('admin');
    expect(resolveHomeRoute(['staff'])).toBe('/(admin)');
    expect(canAccessAdminArea(['admin'])).toBe(true);
    expect(isAdmin(['owner'])).toBe(true);
  });

  it('resolves partner area', () => {
    expect(resolvePrimaryArea(['partner'])).toBe('partner');
    expect(resolveHomeRoute(['partner'])).toBe('/(partner)');
    expect(canAccessPartnerArea(['partner'])).toBe(true);
    expect(isPartner(['customer'])).toBe(false);
  });

  it('resolves customer by default', () => {
    expect(resolveHomeRoute(['customer'])).toBe('/(customer)');
    expect(resolveHomeRoute([])).toBe('/(customer)');
    expect(canAccessAdminArea(['customer'])).toBe(false);
    expect(canAccessPartnerArea(['customer'])).toBe(false);
  });
});
