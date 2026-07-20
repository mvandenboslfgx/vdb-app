import {
  FAIL_CLOSED_FLAGS,
  getFeatureFlags,
  isFeatureEnabled,
  resetFeatureFlags,
  setFeatureFlags,
} from '@/security/featureFlags';

describe('featureFlags', () => {
  beforeEach(() => {
    resetFeatureFlags();
  });

  it('keeps financial flags fail-closed by default', () => {
    const flags = getFeatureFlags();
    for (const key of FAIL_CLOSED_FLAGS) {
      expect(flags[key]).toBe(false);
      expect(isFeatureEnabled(key)).toBe(false);
    }
  });

  it('allows enabling a fail-closed flag explicitly', () => {
    setFeatureFlags({ mollieCheckout: true });
    expect(isFeatureEnabled('mollieCheckout')).toBe(true);
  });

  it('enables non-sensitive flags by default', () => {
    expect(isFeatureEnabled('registration')).toBe(true);
  });
});
