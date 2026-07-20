/**
 * Server-side commission status machine.
 * Clients must never transition statuses directly.
 */

export const COMMISSION_STATUSES = [
  'pending',
  'awaiting_payment',
  'payment_received',
  'under_review',
  'approved',
  'payable',
  'payout_requested',
  'paid',
  'rejected',
  'reversed',
] as const;

export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

const ALLOWED: Record<CommissionStatus, readonly CommissionStatus[]> = {
  pending: ['awaiting_payment', 'rejected'],
  awaiting_payment: ['payment_received', 'rejected', 'reversed'],
  payment_received: ['under_review', 'reversed'],
  under_review: ['approved', 'rejected', 'reversed'],
  approved: ['payable', 'reversed'],
  payable: ['payout_requested', 'reversed'],
  payout_requested: ['paid', 'payable', 'reversed'],
  paid: ['reversed'],
  rejected: [],
  reversed: [],
};

export function canTransitionCommission(
  from: CommissionStatus,
  to: CommissionStatus,
): boolean {
  return ALLOWED[from].includes(to);
}

export function transitionCommission(
  from: CommissionStatus,
  to: CommissionStatus,
): CommissionStatus {
  if (!canTransitionCommission(from, to)) {
    throw new Error(`Illegal commission transition ${from} → ${to}`);
  }
  return to;
}

/** Commission may only become payable after payment was received and approved. */
export function assertPayablePreconditions(input: {
  paymentConfirmed: boolean;
  saleConfirmed: boolean;
  status: CommissionStatus;
}): void {
  if (!input.paymentConfirmed) {
    throw new Error('Commission cannot proceed without confirmed payment to VDB');
  }
  if (!input.saleConfirmed) {
    throw new Error('Commission cannot proceed without confirmed sale');
  }
  if (input.status === 'pending' || input.status === 'awaiting_payment') {
    throw new Error('Commission is not ready for approval');
  }
}

export function calculateCommissionCents(input: {
  basisCents: number;
  rateBps: number;
}): number {
  if (input.basisCents < 0 || input.rateBps < 0 || input.rateBps > 10_000) {
    throw new Error('Invalid commission inputs');
  }
  return Math.floor((input.basisCents * input.rateBps) / 10_000);
}

export function assertPayoutWithinBalance(input: {
  payableCents: number;
  requestedCents: number;
}): void {
  if (input.requestedCents <= 0) {
    throw new Error('Payout amount must be positive');
  }
  if (input.requestedCents > input.payableCents) {
    throw new Error('Payout exceeds payable balance');
  }
}
