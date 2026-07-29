import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';

import ApprovalsScreen from '../../app/(admin)/approvals/index';
import {
  approvePartnerApplication,
  listApprovals,
  rejectPartnerApplication,
} from '@/api/repositories/adminRepository';
import type { AdminQueueItem } from '@/api/mockData';
import { DomainError } from '@/lib/errors';

const mockRunWithStepUp = jest.fn();
const mockOnComplete = jest.fn();

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: jest.fn(() => ({
    roles: ['owner'],
    session: {},
    profile: { id: 'owner-1' },
    loading: false,
  })),
}));

jest.mock('@/features/auth/aal2/useAal2StepUp', () => ({
  useAal2StepUp: () => ({
    visible: false,
    status: null,
    onComplete: mockOnComplete,
    runWithStepUp: (...args: unknown[]) => mockRunWithStepUp(...args),
    probe: jest.fn(),
  }),
}));

jest.mock('@/features/auth/aal2/Aal2StepUpModal', () => ({
  Aal2StepUpModal: () => null,
}));

jest.mock('@/api/repositories/adminRepository', () => ({
  listApprovals: jest.fn(),
  approvePartnerApplication: jest.fn(),
  rejectPartnerApplication: jest.fn(),
}));

const mockListApprovals = listApprovals as jest.MockedFunction<typeof listApprovals>;
const mockApprove = approvePartnerApplication as jest.MockedFunction<
  typeof approvePartnerApplication
>;
const mockReject = rejectPartnerApplication as jest.MockedFunction<typeof rejectPartnerApplication>;

const useAuth = jest.requireMock('@/providers/AuthProvider').useAuth as jest.Mock;

function makeApplication(overrides: Partial<AdminQueueItem> = {}): AdminQueueItem {
  return {
    id: 'app-1',
    type: 'partner_application',
    title: 'Partneraanvraag — Synthetic Pending',
    subtitle: 'PENDING synthetic fixture',
    createdAt: '2026-07-29T00:00:00.000Z',
    priority: 'high',
    ...overrides,
  };
}

describe('ApprovalsScreen partner approval wiring', () => {
  beforeEach(() => {
    mockListApprovals.mockReset();
    mockApprove.mockReset();
    mockReject.mockReset();
    mockRunWithStepUp.mockReset();
    mockOnComplete.mockReset();
    useAuth.mockReset();
    useAuth.mockReturnValue({
      roles: ['owner'],
      session: {},
      profile: { id: 'owner-1' },
      loading: false,
    });
    mockListApprovals.mockResolvedValue([makeApplication()]);
    mockRunWithStepUp.mockImplementation(async (action: () => Promise<unknown>) => {
      const value = await action();
      return { status: 'ok', value };
    });
  });

  it('shows approve button for OWNER when partner applications exist', async () => {
    await renderWithProviders(<ApprovalsScreen />);
    await waitFor(() => expect(screen.getByTestId('admin-partner-approve')).toBeTruthy());
  });

  it('tap calls approve handler exactly once through AAL2 wrapper', async () => {
    mockApprove.mockResolvedValue({ id: 'app-1', status: 'approved' });
    // Call the action, then cancel UI resume so no post-success reload races later tests.
    mockRunWithStepUp.mockImplementation(async (action: () => Promise<unknown>) => {
      await action();
      return { status: 'cancelled' };
    });

    await renderWithProviders(<ApprovalsScreen />);
    await waitFor(() => expect(screen.getByTestId('admin-partner-approve')).toBeTruthy());
    fireEvent.press(screen.getByTestId('admin-partner-approve'));

    await waitFor(() => expect(mockRunWithStepUp).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith('app-1'));
    await waitFor(() => expect(screen.getByTestId('text-approvals-error')).toBeTruthy());
  });

  it('cancel AAL2 shows visible error and does not approve', async () => {
    mockRunWithStepUp.mockResolvedValue({ status: 'cancelled' });

    await renderWithProviders(<ApprovalsScreen />);
    await waitFor(() => expect(screen.getByTestId('admin-partner-approve')).toBeTruthy());
    fireEvent.press(screen.getByTestId('admin-partner-approve'));

    await waitFor(() => expect(screen.getByTestId('text-approvals-error')).toBeTruthy());
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it('AAL2 error surfaces DomainError message and does not claim success', async () => {
    mockRunWithStepUp.mockResolvedValue({
      status: 'error',
      error: DomainError.forbidden('AAL2_REQUIRED'),
    });

    await renderWithProviders(<ApprovalsScreen />);
    await waitFor(() => expect(screen.getByTestId('admin-partner-approve')).toBeTruthy());
    fireEvent.press(screen.getByTestId('admin-partner-approve'));

    await waitFor(() => expect(screen.getByTestId('text-approvals-error')).toBeTruthy());
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it('reject without reason does not call RPC', async () => {
    await renderWithProviders(<ApprovalsScreen />);
    await waitFor(() => expect(screen.getByTestId('admin-partner-reject')).toBeTruthy());
    fireEvent.press(screen.getByTestId('admin-partner-reject'));
    expect(mockReject).not.toHaveBeenCalled();
    expect(mockRunWithStepUp).not.toHaveBeenCalled();
  });

  it('reject with reason resumes once through AAL2', async () => {
    mockReject.mockResolvedValue({ id: 'app-1', status: 'rejected' });
    mockRunWithStepUp.mockImplementation(async (action: () => Promise<unknown>) => {
      await action();
      return { status: 'cancelled' };
    });

    await renderWithProviders(<ApprovalsScreen />);
    await waitFor(() => expect(screen.getByTestId('input-approvals-reject-reason')).toBeTruthy());
    await fireEvent.changeText(
      screen.getByTestId('input-approvals-reject-reason'),
      'Incomplete KYC package',
    );
    await waitFor(() =>
      expect(
        screen.getByTestId('admin-partner-reject').props.accessibilityState?.disabled,
      ).not.toBe(true),
    );
    await fireEvent.press(screen.getByTestId('admin-partner-reject'));

    await waitFor(() => expect(mockReject).toHaveBeenCalledWith('app-1', 'Incomplete KYC package'));
  });

  it('staff without admin capability sees read-only state, no active approve CTA', async () => {
    useAuth.mockReturnValue({
      roles: ['staff'],
      session: {},
      profile: { id: 'staff-1' },
      loading: false,
    });

    await renderWithProviders(<ApprovalsScreen />);
    await waitFor(() => expect(screen.getByTestId('text-approvals-readonly')).toBeTruthy());
    expect(screen.queryByTestId('admin-partner-approve')).toBeNull();
  });

  it('RPC failure through step-up shows retryable error text', async () => {
    mockRunWithStepUp.mockImplementation(async (action: () => Promise<unknown>) => {
      try {
        await action();
        return { status: 'ok', value: null };
      } catch (error) {
        return { status: 'error', error };
      }
    });
    mockApprove.mockRejectedValue(DomainError.forbidden('FORBIDDEN'));

    await renderWithProviders(<ApprovalsScreen />);
    await waitFor(() => expect(screen.getByTestId('admin-partner-approve')).toBeTruthy());
    fireEvent.press(screen.getByTestId('admin-partner-approve'));

    await waitFor(() => expect(screen.getByTestId('text-approvals-error')).toBeTruthy());
  });

  it('double tap while busy only schedules one mutation', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    mockApprove.mockImplementation(async () => {
      await gate;
      return { id: 'app-1', status: 'approved' };
    });
    // Keep success from calling load() — return cancelled after action so no refetch race.
    mockRunWithStepUp.mockImplementation(async (action: () => Promise<unknown>) => {
      await action();
      return { status: 'cancelled' };
    });

    await renderWithProviders(<ApprovalsScreen />);
    await waitFor(() => expect(screen.getByTestId('admin-partner-approve')).toBeTruthy());

    fireEvent.press(screen.getByTestId('admin-partner-approve'));
    fireEvent.press(screen.getByTestId('admin-partner-approve'));

    await waitFor(() => expect(mockApprove).toHaveBeenCalledTimes(1));
    expect(mockRunWithStepUp).toHaveBeenCalledTimes(1);
    release();
    await waitFor(() => expect(screen.getByTestId('text-approvals-error')).toBeTruthy());
  });
});
