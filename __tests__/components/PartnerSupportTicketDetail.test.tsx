import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';
import { useLocalSearchParams } from '../../__mocks__/expo-router';

import PartnerSupportTicketDetailScreen from '../../app/(partner)/support/[id]';
import { getTicket, listMessages, replyTicket } from '@/api/repositories/supportRepository';
import { getPartnerProfile } from '@/api/repositories/partnersRepository';
import type { PartnerProfile, SupportTicket, SupportTicketMessage } from '@/types/domain';

jest.mock('@/api/repositories/supportRepository');
jest.mock('@/api/repositories/partnersRepository');
jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'partner-user-1', email: 'partner.a@local.vdb' },
    session: null,
    profile: null,
    roles: ['partner'],
    loading: false,
    isLoading: false,
    isAuthenticated: true,
    isDemoMode: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    signOutAll: jest.fn(),
    requestPasswordReset: jest.fn(),
    updatePassword: jest.fn(),
    resendVerification: jest.fn(),
    enterDemoAs: jest.fn(),
    refresh: jest.fn(),
  }),
}));

const mockGetTicket = getTicket as jest.MockedFunction<typeof getTicket>;
const mockListMessages = listMessages as jest.MockedFunction<typeof listMessages>;
const mockReplyTicket = replyTicket as jest.MockedFunction<typeof replyTicket>;
const mockGetPartnerProfile = getPartnerProfile as jest.MockedFunction<typeof getPartnerProfile>;

function makeProfile(overrides: Partial<PartnerProfile> = {}): PartnerProfile {
  return {
    id: 'partner-1',
    userId: 'partner-user-1',
    companyName: 'Partner A',
    code: 'PART-A',
    linkUrl: 'https://example.test/r/PART-A',
    status: 'active',
    partnerType: 'BUSINESS',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeTicket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    id: 'ticket-p1',
    subject: 'Partner payout question',
    category: 'billing',
    priority: 'medium',
    status: 'open',
    description: 'When is my payout?',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeMessage(overrides: Partial<SupportTicketMessage> = {}): SupportTicketMessage {
  return {
    id: 'msg-p1',
    ticketId: 'ticket-p1',
    authorId: 'partner-user-1',
    body: 'Following up.',
    isInternal: false,
    createdAt: '2026-07-01T01:00:00.000Z',
    updatedAt: '2026-07-01T01:00:00.000Z',
    ...overrides,
  };
}

describe('PartnerSupportTicketDetailScreen', () => {
  beforeEach(() => {
    useLocalSearchParams.mockReturnValue({ id: 'ticket-p1' });
    jest.clearAllMocks();
    mockGetPartnerProfile.mockResolvedValue(makeProfile());
  });

  it('active partner opens detail with public thread', async () => {
    mockGetTicket.mockResolvedValueOnce(makeTicket());
    mockListMessages.mockResolvedValueOnce([
      makeMessage(),
      makeMessage({
        id: 'msg-staff',
        authorId: 'staff-1',
        body: 'We will review your payout.',
        createdAt: '2026-07-01T02:00:00.000Z',
      }),
    ]);

    await renderWithProviders(<PartnerSupportTicketDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('screen-partner-support-detail')).toBeTruthy(), {
      timeout: 10000,
    });
    expect(screen.getByText('Partner payout question')).toBeTruthy();
    expect(screen.getByTestId('row-partner-support-message-msg-p1')).toBeTruthy();
    expect(screen.getByTestId('row-partner-support-message-msg-staff')).toBeTruthy();
  });

  it('never renders an unexpected internal note in the partner thread', async () => {
    mockGetTicket.mockResolvedValueOnce(makeTicket());
    mockListMessages.mockResolvedValueOnce([
      makeMessage(),
      makeMessage({
        id: 'msg-internal',
        authorId: 'staff-1',
        body: 'Internal partner escalation SECRET',
        isInternal: true,
      }),
    ]);

    await renderWithProviders(<PartnerSupportTicketDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('screen-partner-support-detail')).toBeTruthy(), {
      timeout: 10000,
    });
    expect(screen.queryByTestId('row-partner-support-message-msg-internal')).toBeNull();
    expect(screen.queryByText('Internal partner escalation SECRET')).toBeNull();
  });

  it('active partner places a reply once when allowed', async () => {
    mockGetTicket.mockResolvedValueOnce(makeTicket());
    mockListMessages.mockResolvedValueOnce([makeMessage()]);
    mockReplyTicket.mockResolvedValueOnce(
      makeMessage({ id: 'msg-p2', body: 'Thanks for the update.' }),
    );
    mockGetTicket.mockResolvedValueOnce(makeTicket({ status: 'waiting_for_vdb' }));

    await renderWithProviders(<PartnerSupportTicketDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('input-partner-support-reply')).toBeTruthy(), {
      timeout: 10000,
    });

    await fireEvent.changeText(
      screen.getByTestId('input-partner-support-reply'),
      'Thanks for the update.',
    );
    await fireEvent.press(screen.getByTestId('btn-partner-support-send-reply'));

    await waitFor(
      () => expect(mockReplyTicket).toHaveBeenCalledWith('ticket-p1', 'Thanks for the update.'),
      { timeout: 10000 },
    );
    expect(mockReplyTicket).toHaveBeenCalledTimes(1);
    await waitFor(
      () => expect(screen.getByTestId('text-partner-support-reply-success')).toBeTruthy(),
      { timeout: 10000 },
    );
  });

  it('rejects empty replies by keeping send disabled', async () => {
    mockGetTicket.mockResolvedValueOnce(makeTicket());
    mockListMessages.mockResolvedValueOnce([]);

    await renderWithProviders(<PartnerSupportTicketDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('btn-partner-support-send-reply')).toBeTruthy(), {
      timeout: 10000,
    });
    expect(
      screen.getByTestId('btn-partner-support-send-reply').props.accessibilityState?.disabled,
    ).toBe(true);
    expect(mockReplyTicket).not.toHaveBeenCalled();
  });

  it('closed ticket is read-only', async () => {
    mockGetTicket.mockResolvedValueOnce(makeTicket({ status: 'closed' }));
    mockListMessages.mockResolvedValueOnce([]);

    await renderWithProviders(<PartnerSupportTicketDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('screen-partner-support-detail')).toBeTruthy(), {
      timeout: 10000,
    });
    expect(screen.queryByTestId('input-partner-support-reply')).toBeNull();
    expect(screen.getByTestId('text-partner-support-reply-closed')).toBeTruthy();
  });

  it('unknown partner status fail-closes detail', async () => {
    mockGetPartnerProfile.mockResolvedValueOnce(makeProfile({ status: 'unknown' }));

    await renderWithProviders(<PartnerSupportTicketDetailScreen />);
    await waitFor(
      () =>
        expect(
          screen.getByText('Support tickets are not available for this partner status.'),
        ).toBeTruthy(),
      { timeout: 10000 },
    );
    expect(mockGetTicket).not.toHaveBeenCalled();
    expect(mockReplyTicket).not.toHaveBeenCalled();
  });

  it('shows error and retry when ticket load fails', async () => {
    mockGetTicket.mockRejectedValueOnce(new Error('network'));
    mockListMessages.mockRejectedValueOnce(new Error('network'));

    await renderWithProviders(<PartnerSupportTicketDetailScreen />);
    await waitFor(() => expect(screen.getByText('Tickets could not be loaded.')).toBeTruthy(), {
      timeout: 10000,
    });

    mockGetTicket.mockResolvedValueOnce(makeTicket());
    mockListMessages.mockResolvedValueOnce([]);
    await fireEvent.press(screen.getByText('Try again'));
    await waitFor(() => expect(screen.getByTestId('screen-partner-support-detail')).toBeTruthy(), {
      timeout: 10000,
    });
  });
});
