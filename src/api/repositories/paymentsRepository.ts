import { Platform } from 'react-native';

import { mockStore } from '@/api/mockData';
import { fromOwnerTable } from '@/api/contract/ownerClient';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import { createIdempotencyKey } from '@/lib/idempotency';
import { evaluatePaymentPolicy, isFeatureEnabled } from '@/security/featureFlags';
import { evaluatePaymentPolicy as evaluateStorePolicy } from '@/security/paymentPolicy';
import type { Payment, ProductCategory } from '@/types/domain';

export type CheckoutPlatform = 'ios' | 'android' | 'web';

export interface CreateCheckoutInput {
  invoiceId: string;
  /** Preferred field */
  productCategory?: ProductCategory;
  /** Alias used by some screens */
  category?: ProductCategory;
  /** Alias used by invoice detail screen */
  productType?: ProductCategory;
  platform?: CheckoutPlatform;
  amountCents?: number;
}

export type CreateCheckoutResult =
  | {
      allowed: true;
      ok: true;
      payment: Payment;
      checkoutUrl: string;
    }
  | {
      allowed: false;
      ok: false;
      reason: string;
      messageKey: string;
      payment?: undefined;
      checkoutUrl?: undefined;
    };

function resolvePlatform(explicit?: CheckoutPlatform): CheckoutPlatform {
  if (explicit) return explicit;
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

function blocked(reason: string, messageKey: string): CreateCheckoutResult {
  return { allowed: false, ok: false, reason, messageKey };
}

/**
 * Create a Mollie hosted checkout session.
 * Fail-closed when mollieCheckout is off, payment policy blocks, or the
 * feature is not configured server-side. NEVER marks the invoice/payment as
 * paid locally, and NEVER fabricates a checkout URL when running against
 * Supabase — only the demo adapter returns a synthetic URL.
 */
export async function createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  const platform = resolvePlatform(input.platform);
  const productCategory = input.productCategory ?? input.category ?? input.productType;

  if (!productCategory) {
    return blocked('missing_category', 'payments.policy.checkoutDisabled');
  }

  if (!isFeatureEnabled('mollieCheckout')) {
    return blocked('FEATURE_NOT_CONFIGURED', 'payments.policy.checkoutDisabled');
  }

  const flagPolicy = evaluatePaymentPolicy({
    category: productCategory,
    platform,
  });
  if (!flagPolicy.allowed) {
    const messageKey =
      flagPolicy.reason === 'play_store_billing_gate'
        ? 'payments.policy.playBilling'
        : flagPolicy.reason === 'maintenance_mode'
          ? 'payments.policy.maintenance'
          : flagPolicy.reason === 'restricted_product'
            ? 'payments.policy.restricted'
            : flagPolicy.reason === 'manual_review_required'
              ? 'payments.policy.manualReview'
              : 'payments.policy.checkoutDisabled';
    return blocked(flagPolicy.reason, messageKey);
  }

  const storePolicy = evaluateStorePolicy({
    productType: productCategory,
    platform,
    mollieCheckoutEnabled: isFeatureEnabled('mollieCheckout'),
    digitalProductCheckoutEnabled: isFeatureEnabled('digitalProductCheckout'),
  });
  if (!storePolicy.allowed) {
    return blocked(storePolicy.reason, storePolicy.messageKey);
  }

  const idempotencyKey = createIdempotencyKey('checkout');

  if (shouldUseMockApi()) {
    const invoice = mockStore.invoices.find((i) => i.id === input.invoiceId);
    const amountCents =
      input.amountCents ?? (invoice ? invoice.totalCents - invoice.amountPaidCents : undefined);
    if (!amountCents || amountCents <= 0) {
      return blocked('invalid_amount', 'payments.policy.checkoutDisabled');
    }

    await delay(180);
    // Demo adapter only: fake checkout URL, never marks invoice/payment as paid.
    const payment: Payment = {
      id: `pay-${Date.now()}`,
      invoiceId: input.invoiceId,
      status: 'open',
      amountCents,
      currency: 'EUR',
      checkoutUrl: `https://www.mollie.com/checkout/demo/${idempotencyKey}`,
      productCategory,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockStore.payments.push(payment);
    return { allowed: true, ok: true, payment, checkoutUrl: payment.checkoutUrl! };
  }

  const supabase = requireLiveSupabase();

  let amountCents = input.amountCents;
  if (!amountCents) {
    const { data: invoice, error: invoiceError } = await fromOwnerTable(supabase, 'invoices')
      .select('total_cents, amount_paid_cents')
      .eq('id', input.invoiceId)
      .maybeSingle();
    if (invoiceError) throw fromSupabaseError(invoiceError);
    amountCents =
      invoice &&
      typeof invoice.total_cents === 'number' &&
      typeof invoice.amount_paid_cents === 'number'
        ? invoice.total_cents - invoice.amount_paid_cents
        : undefined;
  }
  if (!amountCents || amountCents <= 0) {
    return blocked('invalid_amount', 'payments.policy.checkoutDisabled');
  }

  const { data, error } = await supabase.functions.invoke('create-mollie-checkout', {
    body: {
      invoiceId: input.invoiceId,
      productCategory,
      platform,
      amountCents,
      idempotencyKey,
    },
  });

  if (error) {
    return blocked(error.message, 'payments.policy.checkoutDisabled');
  }

  const payload = data as {
    payment?: Payment;
    checkoutUrl?: string;
    error?: string;
  };

  if (!payload?.checkoutUrl || !payload.payment) {
    return blocked(payload?.error ?? 'checkout_failed', 'payments.policy.checkoutDisabled');
  }

  // Explicit: never flip local invoice status to paid here.
  const payment: Payment = {
    ...payload.payment,
    status: payload.payment.status === 'paid' ? 'open' : payload.payment.status,
  };

  return {
    allowed: true,
    ok: true,
    payment,
    checkoutUrl: payload.checkoutUrl,
  };
}

export async function listPayments(): Promise<Payment[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.payments];
  }
  requireLiveSupabase();
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:payment_events');
}

export const paymentsRepository = {
  createCheckout,
  list: listPayments,
};
