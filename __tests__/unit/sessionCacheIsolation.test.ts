import { shouldClearQueryCacheOnSessionChange } from '@/lib/auth/sessionCache';

describe('session cache isolation', () => {
  it('clears on logout', () => {
    expect(shouldClearQueryCacheOnSessionChange('user-a', null)).toBe(true);
  });

  it('clears on account switch', () => {
    expect(shouldClearQueryCacheOnSessionChange('user-a', 'user-b')).toBe(true);
  });

  it('does not clear on same-user session refresh', () => {
    expect(shouldClearQueryCacheOnSessionChange('user-a', 'user-a')).toBe(false);
  });

  it('does not clear on first login from empty state', () => {
    expect(shouldClearQueryCacheOnSessionChange(null, 'user-a')).toBe(false);
  });
});
