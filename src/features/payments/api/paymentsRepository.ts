import {
  evaluatePaymentPolicy,
  isFeatureEnabled,
  type PaymentPlatform,
  type ProductCategory,
} from '@/security/featureFlags';

export interface CheckoutRequest {
  invoiceId: string;
  amountCents: number;
  category: ProductCategory;
  platform: PaymentPlatform;
}

export interface CheckoutResult {
  allowed: boolean;
  reason: string;
  checkoutUrl: string | null;
}

export interface PaymentsRepository {
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
}

/**
 * Fail-closed payment repository.
 * Never marks payments as paid from the client.
 */
class FailClosedPaymentsRepository implements PaymentsRepository {
  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    if (!isFeatureEnabled('mollieCheckout')) {
      return {
        allowed: false,
        reason: 'mollie_checkout_disabled',
        checkoutUrl: null,
      };
    }

    const policy = evaluatePaymentPolicy({
      category: request.category,
      platform: request.platform,
    });

    if (!policy.allowed) {
      return {
        allowed: false,
        reason: policy.reason,
        checkoutUrl: null,
      };
    }

    // Server-side checkout creation is required — client never invents paid status
    return {
      allowed: false,
      reason: 'server_checkout_unavailable',
      checkoutUrl: null,
    };
  }
}

export function createPaymentsRepository(): PaymentsRepository {
  return new FailClosedPaymentsRepository();
}
