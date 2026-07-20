import {
  assertPayablePreconditions,
  assertPayoutWithinBalance,
  calculateCommissionCents,
  canTransitionCommission,
  transitionCommission,
} from '@/domain/commissions';

describe('commission state machine', () => {
  it('allows pending → awaiting_payment → payment_received → under_review → approved → payable', () => {
    let status = transitionCommission('pending', 'awaiting_payment');
    status = transitionCommission(status, 'payment_received');
    status = transitionCommission(status, 'under_review');
    status = transitionCommission(status, 'approved');
    status = transitionCommission(status, 'payable');
    expect(status).toBe('payable');
  });

  it('rejects illegal skips such as pending → paid', () => {
    expect(() => transitionCommission('pending', 'paid')).toThrow(/Illegal/);
    expect(canTransitionCommission('pending', 'paid')).toBe(false);
  });

  it('calculates commission from basis and bps', () => {
    expect(calculateCommissionCents({ basisCents: 250_000, rateBps: 1000 })).toBe(25_000);
  });

  it('blocks payable preconditions without payment', () => {
    expect(() =>
      assertPayablePreconditions({
        paymentConfirmed: false,
        saleConfirmed: true,
        status: 'under_review',
      }),
    ).toThrow(/payment/);
  });

  it('blocks payout above payable balance', () => {
    expect(() =>
      assertPayoutWithinBalance({ payableCents: 10_000, requestedCents: 10_001 }),
    ).toThrow(/exceeds/);
  });

  it('supports reverse after paid', () => {
    expect(canTransitionCommission('paid', 'reversed')).toBe(true);
  });
});
