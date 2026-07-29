import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';

import PayoutsIndexScreen from '../../app/(partner)/payouts/index';
import {
  getPayableBalance,
  listCommissions,
  listPayoutRequests,
  requestPayout,
} from '@/api/repositories/commissionsRepository';
import { resetFeatureFlags, setFeatureFlags } from '@/security/featureFlags';
import { formatCurrency } from '@/lib/format';
import type { Commission, PayoutRequest } from '@/types/domain';

// partnersRepository re-exports these same functions (see partnersRepository.ts),
// so mocking commissionsRepository covers both `commissionsRepository.*` and
// the `partnerRepository.*` aliases used by usePartnerData hooks.
jest.mock('@/api/repositories/commissionsRepository');

const mockGetPayableBalance = getPayableBalance as jest.MockedFunction<typeof getPayableBalance>;
const mockListPayoutRequests = listPayoutRequests as jest.MockedFunction<typeof listPayoutRequests>;
const mockRequestPayout = requestPayout as jest.MockedFunction<typeof requestPayout>;
const mockListCommissions = listCommissions as jest.MockedFunction<typeof listCommissions>;

function makeCommission(overrides: Partial<Commission> = {}): Commission {
  return {
    id: 'commission-1',
    partnerId: 'partner-1',
    saleLabel: 'Website redesign — Acme BV',
    amountCents: 3000,
    currency: 'EUR',
    status: 'payable',
    expectedReleaseAt: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function makePayoutRequest(overrides: Partial<PayoutRequest> = {}): PayoutRequest {
  return {
    id: 'payout-1',
    partnerId: 'partner-1',
    payoutAccountId: 'account-1',
    status: 'submitted',
    amountCents: 3000,
    currency: 'EUR',
    submittedAt: '2026-07-02T00:00:00.000Z',
    notes: null,
    createdAt: '2026-07-02T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('PayoutsIndexScreen', () => {
  afterEach(() => {
    resetFeatureFlags();
  });

  it('shows the payable balance and payable commissions', async () => {
    setFeatureFlags({ partnerPayouts: true });
    mockGetPayableBalance.mockResolvedValueOnce({
      amountCents: 3000,
      currency: 'EUR',
      commissionIds: ['commission-1'],
    });
    mockListCommissions.mockResolvedValueOnce([makeCommission()]);
    mockListPayoutRequests.mockResolvedValueOnce([]);

    await renderWithProviders(<PayoutsIndexScreen />);

    await waitFor(() => expect(screen.getByTestId('screen-partner-payouts')).toBeTruthy());
    expect(screen.getByTestId('text-payout-balance').props.children).toBe(formatCurrency(3000));
    expect(screen.getByTestId('row-payout-commission-commission-1')).toBeTruthy();
    expect(screen.getByTestId('text-payout-history-empty')).toBeTruthy();
  });

  it('requests a payout and lists it in the payout history', async () => {
    setFeatureFlags({ partnerPayouts: true });
    mockGetPayableBalance.mockResolvedValueOnce({
      amountCents: 3000,
      currency: 'EUR',
      commissionIds: ['commission-1'],
    });
    mockListCommissions.mockResolvedValueOnce([makeCommission()]);
    mockListPayoutRequests.mockResolvedValueOnce([]);
    mockRequestPayout.mockResolvedValueOnce({
      allowed: true,
      requested: ['commission-1'],
      payoutRequest: makePayoutRequest(),
    });
    // useRequestPayout invalidates all three queries on success — queue their refetch.
    mockGetPayableBalance.mockResolvedValueOnce({
      amountCents: 0,
      currency: 'EUR',
      commissionIds: [],
    });
    mockListCommissions.mockResolvedValueOnce([]);
    mockListPayoutRequests.mockResolvedValueOnce([makePayoutRequest()]);

    await renderWithProviders(<PayoutsIndexScreen />);
    await waitFor(() => expect(screen.getByTestId('btn-payout-request')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('btn-payout-request'));

    await waitFor(() => expect(mockRequestPayout).toHaveBeenCalledWith([], undefined));
    await waitFor(() => expect(screen.getByTestId('row-payout-request-payout-1')).toBeTruthy());
    expect(screen.queryByTestId('text-payout-error')).toBeNull();
  });

  it('shows a disabled-feature state without calling the RPC when the flag is off', async () => {
    setFeatureFlags({ partnerPayouts: false });
    mockGetPayableBalance.mockResolvedValueOnce({
      amountCents: 3000,
      currency: 'EUR',
      commissionIds: ['commission-1'],
    });
    mockListCommissions.mockResolvedValueOnce([makeCommission()]);
    mockListPayoutRequests.mockResolvedValueOnce([]);

    await renderWithProviders(<PayoutsIndexScreen />);
    await waitFor(() => expect(screen.getByTestId('state-payouts-disabled')).toBeTruthy());
    expect(screen.getByText('Payouts are currently disabled.')).toBeTruthy();
    expect(screen.queryByTestId('btn-payout-request')).toBeNull();
    expect(mockRequestPayout).not.toHaveBeenCalled();
  });

  it('shows an insufficient-balance error returned by the repository', async () => {
    setFeatureFlags({ partnerPayouts: true });
    mockGetPayableBalance.mockResolvedValueOnce({
      amountCents: 3000,
      currency: 'EUR',
      commissionIds: ['commission-1'],
    });
    mockListCommissions.mockResolvedValueOnce([makeCommission()]);
    mockListPayoutRequests.mockResolvedValueOnce([]);
    mockRequestPayout.mockResolvedValueOnce({
      allowed: false,
      requested: [],
      reason: 'insufficient_balance',
    });
    // onSuccess fires (and invalidates queries) even for an { allowed: false } result,
    // since the mutation itself resolves rather than rejects — queue the refetch too.
    mockGetPayableBalance.mockResolvedValueOnce({
      amountCents: 3000,
      currency: 'EUR',
      commissionIds: ['commission-1'],
    });
    mockListCommissions.mockResolvedValueOnce([makeCommission()]);
    mockListPayoutRequests.mockResolvedValueOnce([]);

    await renderWithProviders(<PayoutsIndexScreen />);
    await waitFor(() => expect(screen.getByTestId('btn-payout-request')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('btn-payout-request'));

    await waitFor(() => expect(screen.getByTestId('text-payout-error')).toBeTruthy());
    expect(screen.getByText('The requested amount exceeds your payable balance.')).toBeTruthy();
  });
});
