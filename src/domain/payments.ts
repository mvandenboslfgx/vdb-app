/**
 * Mollie webhook reducer — idempotent, never trusts client-reported success.
 */

export type PaymentStatus =
  | 'created'
  | 'open'
  | 'pending'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'canceled'
  | 'refunded'
  | 'partially_refunded'
  | 'charged_back';

export interface PaymentRecord {
  id: string;
  status: PaymentStatus;
  amountCents: number;
  processedEventIds: string[];
}

export interface ProviderPaymentSnapshot {
  id: string;
  status: PaymentStatus;
  amountCents: number;
}

export interface WebhookEventInput {
  externalEventId: string;
  paymentId: string;
  /** Claimed status from webhook body — ignored until provider re-fetch confirms */
  claimedStatus?: PaymentStatus;
}

export type WebhookApplyResult =
  | { kind: 'duplicate'; payment: PaymentRecord }
  | { kind: 'applied'; payment: PaymentRecord; previousStatus: PaymentStatus }
  | { kind: 'ignored'; reason: string; payment: PaymentRecord };

/**
 * Apply a webhook only after an authoritative provider snapshot is available.
 */
export function applyMollieWebhook(input: {
  payment: PaymentRecord;
  event: WebhookEventInput;
  providerSnapshot: ProviderPaymentSnapshot;
}): WebhookApplyResult {
  if (input.event.paymentId !== input.payment.id) {
    return { kind: 'ignored', reason: 'payment_id_mismatch', payment: input.payment };
  }
  if (input.providerSnapshot.id !== input.payment.id) {
    return { kind: 'ignored', reason: 'provider_id_mismatch', payment: input.payment };
  }
  if (input.payment.processedEventIds.includes(input.event.externalEventId)) {
    return { kind: 'duplicate', payment: input.payment };
  }

  const previousStatus = input.payment.status;
  const next: PaymentRecord = {
    ...input.payment,
    status: input.providerSnapshot.status,
    amountCents: input.providerSnapshot.amountCents,
    processedEventIds: [...input.payment.processedEventIds, input.event.externalEventId],
  };

  // Out-of-order: never move from paid → open/pending
  if (
    previousStatus === 'paid' &&
    (next.status === 'open' || next.status === 'pending' || next.status === 'created')
  ) {
    return {
      kind: 'ignored',
      reason: 'stale_status_after_paid',
      payment: {
        ...input.payment,
        processedEventIds: next.processedEventIds,
      },
    };
  }

  return { kind: 'applied', payment: next, previousStatus };
}

export function shouldReleaseCommission(status: PaymentStatus): boolean {
  return status === 'paid';
}

export function shouldReverseCommission(status: PaymentStatus): boolean {
  return status === 'refunded' || status === 'charged_back';
}
