import { Alert } from 'react-native';

import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';

import AdminFinanceScreen from '../../app/(admin)/finance/index';
import { adminRepository } from '@/api/repositories';
import { resetFeatureFlags, setFeatureFlags } from '@/security/featureFlags';
import type { Commission, PayoutRequest } from '@/types/domain';

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    roles: ['admin'],
    session: {},
    profile: { id: 'admin-1' },
    loading: false,
  }),
}));

jest.mock('@/features/auth/aal2/useAal2StepUp', () => ({
  useAal2StepUp: () => ({
    visible: false,
    status: null,
    onComplete: jest.fn(),
    runWithStepUp: async (action: () => Promise<unknown>) => {
      const value = await action();
      return { status: 'ok', value };
    },
    probe: jest.fn(),
  }),
}));

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

jest.mock('@/api/repositories/adminRepository', () => ({
  approveCommission: jest.fn(),
  rejectCommission: jest.fn(),
}));

const mockListCommissions = adminRepository.listCommissions as jest.MockedFunction<
  typeof adminRepository.listCommissions
>;
const mockListPayoutRequests = adminRepository.listPayoutRequests as jest.MockedFunction<
  typeof adminRepository.listPayoutRequests
>;

const adminRepoDirect = jest.requireMock('@/api/repositories/adminRepository') as {
  approveCommission: jest.Mock;
  rejectCommission: jest.Mock;
};

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
    resetFeatureFlags();
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirm = buttons?.find((b) => b.style !== 'cancel');
      confirm?.onPress?.();
    });
  });

  it('lists commissions under review and submitted payout requests when payouts enabled', async () => {
    setFeatureFlags({ partnerPayouts: true });
    mockListCommissions.mockResolvedValueOnce([makeCommission()]);
    mockListPayoutRequests.mockResolvedValueOnce([makePayoutRequest()]);

    await renderWithProviders(<AdminFinanceScreen />);

    await waitFor(() => expect(screen.getByTestId('screen-admin-finance')).toBeTruthy(), {
      timeout: 10000,
    });
    expect(screen.getByTestId('row-finance-commission-0')).toBeTruthy();
    expect(screen.getByTestId('row-finance-payout-0')).toBeTruthy();
  });

  it('approves a commission once a reason is provided', async () => {
    mockListCommissions.mockResolvedValueOnce([makeCommission()]);
    mockListPayoutRequests.mockResolvedValueOnce([]);
    adminRepoDirect.approveCommission.mockResolvedValueOnce({
      id: 'commission-1',
      status: 'approved',
    });
    mockListCommissions.mockResolvedValueOnce([]);
    mockListPayoutRequests.mockResolvedValueOnce([]);

    await renderWithProviders(<AdminFinanceScreen />);
    await waitFor(() => expect(screen.getByTestId('row-finance-commission-0')).toBeTruthy(), {
      timeout: 10000,
    });

    await fireEvent.press(screen.getByTestId('row-finance-commission-0'));
    await waitFor(() => expect(screen.getByTestId('btn-finance-approve-commission')).toBeTruthy(), {
      timeout: 10000,
    });

    expect(
      screen.getByTestId('btn-finance-approve-commission').props.accessibilityState?.disabled,
    ).toBe(true);

    await fireEvent.changeText(screen.getByTestId('input-finance-reason'), 'Verified with client');
    await fireEvent.press(screen.getByTestId('btn-finance-approve-commission'));

    await waitFor(
      () =>
        expect(adminRepoDirect.approveCommission).toHaveBeenCalledWith(
          'commission-1',
          'Verified with client',
          expect.any(String),
        ),
      { timeout: 10000 },
    );
  });

  it('shows payouts disabled state when partnerPayouts flag is off', async () => {
    setFeatureFlags({ partnerPayouts: false });
    mockListCommissions.mockResolvedValueOnce([]);
    mockListPayoutRequests.mockResolvedValueOnce([makePayoutRequest()]);

    await renderWithProviders(<AdminFinanceScreen />);
    await waitFor(() => expect(screen.getByTestId('screen-admin-finance')).toBeTruthy(), {
      timeout: 10000,
    });
    expect(screen.getByText('Payouts are currently disabled.')).toBeTruthy();
    expect(screen.queryByTestId('row-finance-payout-0')).toBeNull();
    expect(mockListPayoutRequests).not.toHaveBeenCalled();
  });
});
