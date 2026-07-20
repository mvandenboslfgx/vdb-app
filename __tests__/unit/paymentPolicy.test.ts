import { evaluatePaymentPolicy } from '@/security/paymentPolicy';

describe('paymentPolicy', () => {
  it('fails closed when mollie is disabled', () => {
    const decision = evaluatePaymentPolicy({
      productType: 'custom_project',
      platform: 'web',
      mollieCheckoutEnabled: false,
      digitalProductCheckoutEnabled: false,
    });
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.messageKey).toBe('payments.policy.checkoutDisabled');
    }
  });

  it('blocks restricted products even when mollie is on', () => {
    const decision = evaluatePaymentPolicy({
      productType: 'restricted',
      platform: 'web',
      mollieCheckoutEnabled: true,
      digitalProductCheckoutEnabled: true,
    });
    expect(decision.allowed).toBe(false);
  });

  it('allows custom projects on web when mollie is enabled', () => {
    const decision = evaluatePaymentPolicy({
      productType: 'custom_project',
      platform: 'web',
      mollieCheckoutEnabled: true,
      digitalProductCheckoutEnabled: false,
    });
    expect(decision.allowed).toBe(true);
  });

  it('blocks digital goods on android without digital flag', () => {
    const decision = evaluatePaymentPolicy({
      productType: 'digital_good',
      platform: 'android',
      mollieCheckoutEnabled: true,
      digitalProductCheckoutEnabled: false,
    });
    expect(decision.allowed).toBe(false);
  });
});
