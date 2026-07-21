import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';

import AdminFinanceScreen from '../../app/(admin)/finance/index';
import { adminRepository } from '@/api/repositories';
import { DomainError } from '@/lib/errors';
import type { Commission, PayoutRequest } from '@/types/domain';

jest.mock('@/api/repositories', () => ({
  adminRepository: {
    listCommissions: jest.fn(),
    listPayoutRequests: jest.fn(),
    approveCommission: jest.fn(),
    rejectCommission: jest.fn(),
    processPayoutRequest: jest.fn(),
    rejectPayoutRequest: jest.fn(),
  },
}));

const mockListCommissions = adminRepository.listCommissions as jest.MockedFunction<
  typeof adminRepository.listCommissions
>;
const mockListPayoutRequests = adminRepository.listPayoutRequests as jest.MockedFunction<
  typeof adminRepository.listPayoutRequests
>;
const mockApproveCommission = adminRepository.approveCommission as jest.MockedFunction<
  typeof adminRepository.approveCommission
>;
const mockRejectPayoutRequest = adminRepository.rejectPayoutRequest as jest.MockedFunction<
  typeof adminRepository.rejectPayoutRequest
>;

function makeCommission(overrides: Partial<Commission> = {}): Commission {
  return {
    id: 'commission-1',
    partnerId: 'partner-1',
    saleLabel: 'Website redesign — Acme BV',
    amountCents: 2000,
    currency: 'EUR',
    status: 'under_review',
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

describe('AdminFinanceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists commissions under review and submitted payout requests', async () => {
    mockListCommissions.mockResolvedValueOnce([makeCommission()]);
    mockListPayoutRequests.mockResolvedValueOnce([makePayoutRequest()]);

    await renderWithProviders(<AdminFinanceScreen />);

    await waitFor(() => expect(screen.getByTestId('screen-admin-finance')).toBeTruthy());
    expect(screen.getByTestId('row-finance-commission-0')).toBeTruthy();
    expect(screen.getByTestId('row-finance-payout-0')).toBeTruthy();
  });

  it('approves a commission once a reason is provided', async () => {
    mockListCommissions.mockResolvedValueOnce([makeCommission()]);
    mockListPayoutRequests.mockResolvedValueOnce([]);
    mockApproveCommission.mockResolvedValueOnce({ id: 'commission-1', status: 'approved' });
    mockListCommissions.mockResolvedValueOnce([]);
    mockListPayoutRequests.mockResolvedValueOnce([]);

    await renderWithProviders(<AdminFinanceScreen />);
    await waitFor(() => expect(screen.getByTestId('row-finance-commission-0')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('row-finance-commission-0'));
    await waitFor(() => expect(screen.getByTestId('btn-finance-approve-commission')).toBeTruthy());

    expect(screen.getByTestId('btn-finance-approve-commission').props.accessibilityState?.disabled).toBe(
      true,
    );

    await fireEvent.changeText(screen.getByTestId('input-finance-reason'), 'Verified with client');
    await fireEvent.press(screen.getByTestId('btn-finance-approve-commission'));

    await waitFor(() =>
      expect(mockApproveCommission).toHaveBeenCalledWith('commission-1', 'Verified with client'),
    );
  });

  it('shows an error when rejecting a payout request fails', async () => {
    mockListCommissions.mockResolvedValueOnce([]);
    mockListPayoutRequests.mockResolvedValueOnce([makePayoutRequest()]);
    mockRejectPayoutRequest.mockRejectedValueOnce(
      DomainError.validation('Payout rejection reason required'),
    );

    await renderWithProviders(<AdminFinanceScreen />);
    await waitFor(() => expect(screen.getByTestId('row-finance-payout-0')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('row-finance-payout-0'));
    await waitFor(() => expect(screen.getByTestId('btn-finance-reject-payout')).toBeTruthy());

    await fireEvent.changeText(screen.getByTestId('input-finance-payout-reason'), 'Bank details invalid');
    await fireEvent.press(screen.getByTestId('btn-finance-reject-payout'));

    await waitFor(() => expect(screen.getByTestId('text-finance-error')).toBeTruthy());
    expect(screen.getByText('Please check your input and try again.')).toBeTruthy();
  });
});
