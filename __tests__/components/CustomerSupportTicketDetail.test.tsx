import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';
import { useLocalSearchParams } from '../../__mocks__/expo-router';

import SupportTicketDetailScreen from '../../app/(customer)/support/[id]';
import { getTicket, listMessages, replyTicket } from '@/api/repositories/supportRepository';
import type { SupportTicket, SupportTicketMessage } from '@/types/domain';

jest.mock('@/api/repositories/supportRepository');
jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'customer-1', email: 'customer.a@local.vdb' },
    session: null,
    profile: null,
    roles: ['customer'],
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

function makeTicket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    id: 'ticket-1',
    subject: 'Login issue',
    category: 'technical',
    priority: 'medium',
    status: 'open',
    description: 'I cannot sign in on my phone.',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeMessage(overrides: Partial<SupportTicketMessage> = {}): SupportTicketMessage {
  return {
    id: 'msg-1',
    ticketId: 'ticket-1',
    authorId: 'customer-1',
    body: 'Still broken after reset.',
    isInternal: false,
    createdAt: '2026-07-01T01:00:00.000Z',
    updatedAt: '2026-07-01T01:00:00.000Z',
    ...overrides,
  };
}

describe('CustomerSupportTicketDetailScreen', () => {
  beforeEach(() => {
    useLocalSearchParams.mockReturnValue({ id: 'ticket-1' });
    jest.clearAllMocks();
  });

  it('loads ticket metadata and the public message thread', async () => {
    mockGetTicket.mockResolvedValueOnce(makeTicket());
    mockListMessages.mockResolvedValueOnce([
      makeMessage(),
      makeMessage({
        id: 'msg-staff',
        authorId: 'staff-1',
        body: 'We are looking into this.',
        createdAt: '2026-07-01T02:00:00.000Z',
      }),
    ]);

    await renderWithProviders(<SupportTicketDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('screen-support-detail')).toBeTruthy(), {
      timeout: 10000,
    });
    expect(screen.getByText('Login issue')).toBeTruthy();
    expect(screen.getByTestId('row-support-message-msg-1')).toBeTruthy();
    expect(screen.getByTestId('row-support-message-msg-staff')).toBeTruthy();
    expect(screen.getByText('You')).toBeTruthy();
    expect(screen.getByText('VDB Support')).toBeTruthy();
  });

  it('never renders an unexpected internal note in the customer thread', async () => {
    mockGetTicket.mockResolvedValueOnce(makeTicket());
    mockListMessages.mockResolvedValueOnce([
      makeMessage(),
      makeMessage({
        id: 'msg-internal',
        authorId: 'staff-1',
        body: 'Escalated internally — do not show',
        isInternal: true,
      }),
    ]);

    await renderWithProviders(<SupportTicketDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('screen-support-detail')).toBeTruthy(), {
      timeout: 10000,
    });
    expect(screen.getByTestId('row-support-message-msg-1')).toBeTruthy();
    expect(screen.queryByTestId('row-support-message-msg-internal')).toBeNull();
    expect(screen.queryByText('Escalated internally — do not show')).toBeNull();
  });

  it('sends a customer reply once and appends it to the thread', async () => {
    mockGetTicket.mockResolvedValueOnce(makeTicket());
    mockListMessages.mockResolvedValueOnce([makeMessage()]);
    mockReplyTicket.mockResolvedValueOnce(
      makeMessage({ id: 'msg-2', body: 'Thanks, I tried again.' }),
    );
    mockGetTicket.mockResolvedValueOnce(makeTicket({ status: 'waiting_for_vdb' }));

    await renderWithProviders(<SupportTicketDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('input-support-reply')).toBeTruthy(), {
      timeout: 10000,
    });

    await fireEvent.changeText(screen.getByTestId('input-support-reply'), 'Thanks, I tried again.');
    await fireEvent.press(screen.getByTestId('btn-support-send-reply'));

    await waitFor(
      () => expect(mockReplyTicket).toHaveBeenCalledWith('ticket-1', 'Thanks, I tried again.'),
      { timeout: 10000 },
    );
    await waitFor(() => expect(screen.getByTestId('row-support-message-msg-2')).toBeTruthy(), {
      timeout: 10000,
    });
    await waitFor(() => expect(screen.getByTestId('text-support-reply-success')).toBeTruthy(), {
      timeout: 10000,
    });
    expect(mockReplyTicket).toHaveBeenCalledTimes(1);
  });

  it('rejects empty replies by keeping send disabled', async () => {
    mockGetTicket.mockResolvedValueOnce(makeTicket());
    mockListMessages.mockResolvedValueOnce([]);

    await renderWithProviders(<SupportTicketDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('btn-support-send-reply')).toBeTruthy(), {
      timeout: 10000,
    });
    expect(screen.getByTestId('btn-support-send-reply').props.accessibilityState?.disabled).toBe(
      true,
    );
    expect(mockReplyTicket).not.toHaveBeenCalled();
  });

  it('hides the reply composer when the ticket is closed', async () => {
    mockGetTicket.mockResolvedValueOnce(makeTicket({ status: 'closed' }));
    mockListMessages.mockResolvedValueOnce([]);

    await renderWithProviders(<SupportTicketDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('screen-support-detail')).toBeTruthy(), {
      timeout: 10000,
    });
    expect(screen.queryByTestId('input-support-reply')).toBeNull();
    expect(screen.getByTestId('text-support-reply-closed')).toBeTruthy();
  });

  it('shows an error state with retry when the ticket fails to load', async () => {
    mockGetTicket.mockRejectedValueOnce(new Error('network'));
    mockListMessages.mockRejectedValueOnce(new Error('network'));

    await renderWithProviders(<SupportTicketDetailScreen />);
    await waitFor(() => expect(screen.getByText('Tickets could not be loaded.')).toBeTruthy(), {
      timeout: 10000,
    });

    mockGetTicket.mockResolvedValueOnce(makeTicket());
    mockListMessages.mockResolvedValueOnce([]);
    await fireEvent.press(screen.getByText('Try again'));
    await waitFor(() => expect(screen.getByTestId('screen-support-detail')).toBeTruthy(), {
      timeout: 10000,
    });
  });
});
