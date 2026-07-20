import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';
import { useLocalSearchParams } from '../../__mocks__/expo-router';

import AdminTicketDetailScreen from '../../app/(admin)/tickets/[id]';
import { replyPublic, updateTicketStatus } from '@/api/repositories/adminRepository';
import { getTicket, listMessages } from '@/api/repositories/supportRepository';
import { DomainError } from '@/lib/errors';
import type { SupportTicket, SupportTicketMessage } from '@/types/domain';

jest.mock('@/api/repositories/adminRepository');
jest.mock('@/api/repositories/supportRepository');

const mockGetTicket = getTicket as jest.MockedFunction<typeof getTicket>;
const mockListMessages = listMessages as jest.MockedFunction<typeof listMessages>;
const mockReplyPublic = replyPublic as jest.MockedFunction<typeof replyPublic>;
const mockUpdateTicketStatus = updateTicketStatus as jest.MockedFunction<typeof updateTicketStatus>;

function makeTicket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    id: 'ticket-1',
    subject: 'Invoice question',
    category: 'billing',
    priority: 'medium',
    status: 'open',
    description: 'Customer has a question about their invoice.',
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
    body: 'Can you clarify the hours billed?',
    isInternal: false,
    createdAt: '2026-07-01T01:00:00.000Z',
    updatedAt: '2026-07-01T01:00:00.000Z',
    ...overrides,
  };
}

describe('AdminTicketDetailScreen', () => {
  beforeEach(() => {
    useLocalSearchParams.mockReturnValue({ id: 'ticket-1' });
  });

  it('shows the ticket thread, distinguishing internal notes from public messages', async () => {
    mockGetTicket.mockResolvedValueOnce(makeTicket());
    mockListMessages.mockResolvedValueOnce([
      makeMessage(),
      makeMessage({ id: 'msg-2', isInternal: true, body: 'Escalated to finance (internal)' }),
    ]);

    await renderWithProviders(<AdminTicketDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('screen-admin-ticket-detail')).toBeTruthy());
    expect(screen.getByText('Invoice question')).toBeTruthy();
    expect(screen.getByTestId('row-ticket-message-msg-1')).toBeTruthy();
    expect(screen.getByTestId('row-ticket-message-msg-2')).toBeTruthy();
    expect(screen.getAllByText('Internal note')).toHaveLength(2); // the toggle label + msg-2's badge
  });

  it('sends a public reply and appends it to the thread', async () => {
    mockGetTicket.mockResolvedValueOnce(makeTicket());
    mockListMessages.mockResolvedValueOnce([makeMessage()]);
    mockReplyPublic.mockResolvedValueOnce(
      makeMessage({ id: 'msg-3', body: 'Sure, here is the breakdown.', authorId: 'staff-1' }),
    );
    mockGetTicket.mockResolvedValueOnce(makeTicket({ status: 'waiting_for_customer' }));

    await renderWithProviders(<AdminTicketDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('input-ticket-reply')).toBeTruthy());

    await fireEvent.changeText(screen.getByTestId('input-ticket-reply'), 'Sure, here is the breakdown.');
    await fireEvent.press(screen.getByTestId('btn-ticket-send-reply'));

    await waitFor(() =>
      expect(mockReplyPublic).toHaveBeenCalledWith('ticket-1', 'Sure, here is the breakdown.'),
    );
    await waitFor(() => expect(screen.getByTestId('row-ticket-message-msg-3')).toBeTruthy());
  });

  it('requires a reason before resolving a ticket, and surfaces status-update errors', async () => {
    mockGetTicket.mockResolvedValueOnce(makeTicket());
    mockListMessages.mockResolvedValueOnce([]);
    mockUpdateTicketStatus.mockRejectedValueOnce(
      DomainError.validation('A reason is required to resolve or close a ticket'),
    );

    await renderWithProviders(<AdminTicketDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('btn-ticket-status-resolved')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('btn-ticket-status-resolved'));

    await waitFor(() => expect(screen.getByTestId('input-ticket-status-reason')).toBeTruthy());
    expect(screen.getByTestId('btn-ticket-status-confirm').props.accessibilityState?.disabled).toBe(true);
    expect(mockUpdateTicketStatus).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('input-ticket-status-reason'), 'Issue clarified');
    await fireEvent.press(screen.getByTestId('btn-ticket-status-confirm'));

    await waitFor(() =>
      expect(mockUpdateTicketStatus).toHaveBeenCalledWith('ticket-1', 'resolved', 'Issue clarified'),
    );
    await waitFor(() => expect(screen.getByTestId('text-ticket-status-error')).toBeTruthy());
  });
});
