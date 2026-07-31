/**
 * Live checkout invoke contract — fail-closed naming + no client amount authority.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockInvoke = jest.fn();
const mockMaybeSingle = jest.fn();

jest.mock('@/api/repositories/_utils', () => ({
  shouldUseMockApi: () => false,
  requireLiveSupabase: () => ({
    functions: { invoke: mockInvoke },
  }),
  delay: async () => undefined,
}));

jest.mock('@/api/contract/ownerClient', () => ({
  fromOwnerTable: () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: mockMaybeSingle,
      }),
    }),
  }),
}));

jest.mock('@/security/featureFlags', () => ({
  isFeatureEnabled: (flag: string) => flag === 'mollieCheckout',
  evaluatePaymentPolicy: () => ({ allowed: true }),
}));

jest.mock('@/security/paymentPolicy', () => ({
  evaluatePaymentPolicy: () => ({ allowed: true }),
}));

import { createCheckout } from '@/api/repositories/paymentsRepository';

describe('createCheckout live invoke', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockMaybeSingle.mockReset();
    mockMaybeSingle.mockResolvedValue({
      data: { total_cents: 1999, amount_paid_cents: 0, status: 'open' },
      error: null,
    });
    mockInvoke.mockResolvedValue({
      data: {
        checkoutUrl: 'https://www.mollie.com/checkout/test/demo',
        payment: {
          id: 'pay_demo',
          invoiceId: 'inv-1',
          status: 'open',
          amountCents: 1999,
          currency: 'EUR',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      error: null,
    });
  });

  it('invokes create-checkout (not create-mollie-checkout) without client amount', async () => {
    const result = await createCheckout({
      invoiceId: 'inv-1',
      productCategory: 'custom_project',
      amountCents: 1999,
    });

    expect(result.ok).toBe(true);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    const [fnName, opts] = mockInvoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(fnName).toBe('create-checkout');
    expect(opts.body).not.toHaveProperty('amountCents');
    expect(opts.body.invoiceId).toBe('inv-1');
  });

  it('blocks when client amountCents mismatches server due balance', async () => {
    const result = await createCheckout({
      invoiceId: 'inv-1',
      productCategory: 'custom_project',
      amountCents: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('amount_mismatch');
    }
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
