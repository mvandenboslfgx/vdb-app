import {
  ADMIN_HIDDEN_TAB_NAMES,
  ADMIN_MAX_PRIMARY_TABS,
  ADMIN_PRIMARY_TAB_NAMES,
} from '@/navigation/adminTabShell';

describe('admin primary tab shell', () => {
  it('allows at most five primary tabs', () => {
    expect(ADMIN_MAX_PRIMARY_TABS).toBe(5);
    expect(ADMIN_PRIMARY_TAB_NAMES).toHaveLength(5);
  });

  it('keeps leads out of the primary set (Meer entry only)', () => {
    expect(ADMIN_PRIMARY_TAB_NAMES).not.toContain('leads');
    expect(ADMIN_HIDDEN_TAB_NAMES).toContain('leads');
  });

  it('matches the Owner-approved admin order', () => {
    expect([...ADMIN_PRIMARY_TAB_NAMES]).toEqual([
      'index',
      'approvals',
      'tickets',
      'finance',
      'more',
    ]);
  });
});
