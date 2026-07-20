import {
  applyMollieWebhook,
  shouldReleaseCommission,
  shouldReverseCommission,
  type PaymentRecord,
} from '@/domain/payments';
import { createFakePaymentProvider } from '@/domain/paymentProvider';

describe('mollie webhook reducer', () => {
  const basePayment = (): PaymentRecord => ({
    id: 'tr_1',
    status: 'open',
    amountCents: 18150,
    processedEventIds: [],
  });

  it('applies provider-confirmed paid status', () => {
    const result = applyMollieWebhook({
      payment: basePayment(),
      event: { externalEventId: 'evt_1', paymentId: 'tr_1', claimedStatus: 'paid' },
      providerSnapshot: { id: 'tr_1', status: 'paid', amountCents: 18150 },
    });
    expect(result.kind).toBe('applied');
    if (result.kind === 'applied') {
      expect(result.payment.status).toBe('paid');
      expect(shouldReleaseCommission(result.payment.status)).toBe(true);
    }
  });

  it('is idempotent on duplicate externalEventId', () => {
    const first = applyMollieWebhook({
      payment: basePayment(),
      event: { externalEventId: 'evt_1', paymentId: 'tr_1' },
      providerSnapshot: { id: 'tr_1', status: 'paid', amountCents: 18150 },
    });
    expect(first.kind).toBe('applied');
    if (first.kind !== 'applied') return;
    const second = applyMollieWebhook({
      payment: first.payment,
      event: { externalEventId: 'evt_1', paymentId: 'tr_1' },
      providerSnapshot: { id: 'tr_1', status: 'paid', amountCents: 18150 },
    });
    expect(second.kind).toBe('duplicate');
  });

  it('ignores stale open after paid (out-of-order)', () => {
    const paid: PaymentRecord = {
      id: 'tr_1',
      status: 'paid',
      amountCents: 18150,
      processedEventIds: ['evt_paid'],
    };
    const result = applyMollieWebhook({
      payment: paid,
      event: { externalEventId: 'evt_stale', paymentId: 'tr_1' },
      providerSnapshot: { id: 'tr_1', status: 'open', amountCents: 18150 },
    });
    expect(result.kind).toBe('ignored');
    if (result.kind === 'ignored') {
      expect(result.reason).toBe('stale_status_after_paid');
      expect(result.payment.status).toBe('paid');
    }
  });

  it('flags refund/chargeback for commission reversal', () => {
    expect(shouldReverseCommission('refunded')).toBe(true);
    expect(shouldReverseCommission('charged_back')).toBe(true);
    expect(shouldReverseCommission('paid')).toBe(false);
  });

  it('fake provider creates checkout without live Mollie key', async () => {
    const provider = createFakePaymentProvider('unit');
    const checkout = await provider.createCheckout({
      amountCents: 1000,
      currency: 'EUR',
      description: 'Test',
      redirectUrl: 'https://vdbdigital.nl/app/invoices/1',
      webhookUrl: 'https://example.test/webhook',
      idempotencyKey: 'idem-1',
      metadata: { invoiceId: '1' },
    });
    expect(checkout.checkoutUrl).toContain('mollie.com/checkout/test');
    const fetched = await provider.fetchPayment(checkout.paymentId);
    expect(fetched.status).toBe('open');
  });
});
