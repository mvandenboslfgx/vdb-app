/**
 * Play Store / product payment policy gate.
 * Mollie checkout for risky digital goods stays disabled unless explicitly allowed.
 */

export const PRODUCT_POLICY_TYPES = [
  'service',
  'physical_product',
  'custom_project',
  'digital_good',
  'external_subscription',
  'restricted',
  'manual_review_required',
] as const;

export type ProductPolicyType = (typeof PRODUCT_POLICY_TYPES)[number];

export type CheckoutPlatform = 'android' | 'ios' | 'web';

export type PaymentPolicyDecision =
  | { allowed: true; route: 'mollie_hosted' | 'manual_invoice' }
  | {
      allowed: false;
      reason:
        | 'feature_disabled'
        | 'play_billing_risk'
        | 'restricted_product'
        | 'manual_review_required'
        | 'unsupported_platform';
      messageKey: string;
    };

export interface PaymentPolicyInput {
  productType: ProductPolicyType;
  platform: CheckoutPlatform;
  mollieCheckoutEnabled: boolean;
  digitalProductCheckoutEnabled: boolean;
  countryCode?: string;
}

export function evaluatePaymentPolicy(
  input: PaymentPolicyInput,
): PaymentPolicyDecision {
  if (!input.mollieCheckoutEnabled) {
    return {
      allowed: false,
      reason: 'feature_disabled',
      messageKey: 'payments.policy.checkoutDisabled',
    };
  }

  if (
    input.productType === 'restricted' ||
    input.productType === 'external_subscription'
  ) {
    return {
      allowed: false,
      reason: 'restricted_product',
      messageKey: 'payments.policy.restricted',
    };
  }

  if (input.productType === 'manual_review_required') {
    return {
      allowed: false,
      reason: 'manual_review_required',
      messageKey: 'payments.policy.manualReview',
    };
  }

  // external_subscription already returned above; only digital_good remains here
  const isDigital = input.productType === 'digital_good';

  if (isDigital && input.platform === 'android') {
    if (!input.digitalProductCheckoutEnabled) {
      return {
        allowed: false,
        reason: 'play_billing_risk',
        messageKey: 'payments.policy.playBilling',
      };
    }
  }

  if (
    input.productType === 'service' ||
    input.productType === 'custom_project' ||
    input.productType === 'physical_product'
  ) {
    return { allowed: true, route: 'mollie_hosted' };
  }

  if (input.productType === 'digital_good' && input.digitalProductCheckoutEnabled) {
    return { allowed: true, route: 'mollie_hosted' };
  }

  return {
    allowed: false,
    reason: 'feature_disabled',
    messageKey: 'payments.policy.checkoutDisabled',
  };
}
