import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';

import PartnerSupportListScreen from '../../app/(partner)/support/index';
import PartnerNewSupportTicketScreen from '../../app/(partner)/support/new';
import { createTicket, listTickets } from '@/api/repositories/supportRepository';
import { getPartnerProfile } from '@/api/repositories/partnersRepository';
import type { PartnerProfile, SupportTicket } from '@/types/domain';

jest.mock('@/api/repositories/supportRepository');
jest.mock('@/api/repositories/partnersRepository');

const mockListTickets = listTickets as jest.MockedFunction<typeof listTickets>;
const mockCreateTicket = createTicket as jest.MockedFunction<typeof createTicket>;
const mockGetPartnerProfile = getPartnerProfile as jest.MockedFunction<typeof getPartnerProfile>;

function makeProfile(overrides: Partial<PartnerProfile> = {}): PartnerProfile {
  return {
    id: 'partner-1',
    userId: 'partner-user-1',
    companyName: 'Partner A',
    code: 'PART-A',
    linkUrl: 'https://example.test/r/PART-A',
    status: 'active',
    partnerType: 'INDIVIDUAL',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeTicket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    id: 'ticket-p1',
    subject: 'Partner help',
    category: 'account',
    priority: 'medium',
    status: 'open',
    description: 'Need help',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('PartnerSupportListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPartnerProfile.mockResolvedValue(makeProfile());
  });

  it('active partner sees ticket list without message bodies', async () => {
    mockListTickets.mockResolvedValueOnce([makeTicket()]);

    await renderWithProviders(<PartnerSupportListScreen />);
    await waitFor(() => expect(screen.getByTestId('screen-partner-support')).toBeTruthy(), {
      timeout: 10000,
    });
    expect(screen.getByText('Partner help')).toBeTruthy();
    expect(screen.getByTestId('row-partner-ticket-ticket-p1')).toBeTruthy();
    expect(screen.queryByText('Need help')).toBeNull();
    expect(screen.getByTestId('btn-partner-support-new')).toBeTruthy();
  });

  it('pending partner status still allows list/create (capability ALWAYS_SAFE)', async () => {
    mockGetPartnerProfile.mockResolvedValueOnce(
      makeProfile({ status: 'pending', partnerType: 'BUSINESS' }),
    );
    mockListTickets.mockResolvedValueOnce([]);

    await renderWithProviders(<PartnerSupportListScreen />);
    await waitFor(() => expect(screen.getByTestId('screen-partner-support')).toBeTruthy(), {
      timeout: 10000,
    });
    expect(screen.getByTestId('btn-partner-support-new')).toBeTruthy();
  });

  it('suspended partner status still allows list (capability ALWAYS_SAFE)', async () => {
    mockGetPartnerProfile.mockResolvedValueOnce(makeProfile({ status: 'suspended' }));
    mockListTickets.mockResolvedValueOnce([makeTicket({ subject: 'Suspended support' })]);

    await renderWithProviders(<PartnerSupportListScreen />);
    await waitFor(() => expect(screen.getByText('Suspended support')).toBeTruthy(), {
      timeout: 10000,
    });
  });

  it('unknown status fail-closes the list', async () => {
    mockGetPartnerProfile.mockResolvedValueOnce(makeProfile({ status: 'unknown' }));

    await renderWithProviders(<PartnerSupportListScreen />);
    await waitFor(
      () =>
        expect(
          screen.getByText('Support tickets are not available for this partner status.'),
        ).toBeTruthy(),
      { timeout: 10000 },
    );
    expect(mockListTickets).not.toHaveBeenCalled();
  });
});

describe('PartnerNewSupportTicketScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPartnerProfile.mockResolvedValue(makeProfile());
  });

  it('active partner creates exactly one ticket when allowed', async () => {
    mockCreateTicket.mockResolvedValueOnce(makeTicket({ id: 'ticket-created' }));

    await renderWithProviders(<PartnerNewSupportTicketScreen />);
    await waitFor(() => expect(screen.getByTestId('screen-partner-support-new')).toBeTruthy(), {
      timeout: 10000,
    });

    await fireEvent.changeText(screen.getByTestId('input-partner-support-subject'), 'Help please');
    await fireEvent.changeText(
      screen.getByTestId('input-partner-support-description'),
      'First message body',
    );
    await fireEvent.press(screen.getByTestId('btn-partner-support-submit'));

    await waitFor(() => expect(mockCreateTicket).toHaveBeenCalledTimes(1), { timeout: 10000 });
    expect(mockCreateTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Help please',
        description: 'First message body',
      }),
    );
  });

  it('keeps submit disabled for empty create', async () => {
    await renderWithProviders(<PartnerNewSupportTicketScreen />);
    await waitFor(() => expect(screen.getByTestId('btn-partner-support-submit')).toBeTruthy(), {
      timeout: 10000,
    });
    expect(
      screen.getByTestId('btn-partner-support-submit').props.accessibilityState?.disabled,
    ).toBe(true);
    expect(mockCreateTicket).not.toHaveBeenCalled();
  });

  it('double-submit lock yields a single create mutation', async () => {
    let resolveCreate: (value: SupportTicket) => void = () => undefined;
    mockCreateTicket.mockImplementationOnce(
      () =>
        new Promise<SupportTicket>((resolve) => {
          resolveCreate = resolve;
        }),
    );

    await renderWithProviders(<PartnerNewSupportTicketScreen />);
    await waitFor(() => expect(screen.getByTestId('input-partner-support-subject')).toBeTruthy(), {
      timeout: 10000,
    });
    await fireEvent.changeText(screen.getByTestId('input-partner-support-subject'), 'Once');
    await fireEvent.changeText(
      screen.getByTestId('input-partner-support-description'),
      'Only once',
    );

    const submit = screen.getByTestId('btn-partner-support-submit');
    await fireEvent.press(submit);
    await fireEvent.press(submit);

    resolveCreate(makeTicket({ id: 'ticket-once' }));
    await waitFor(() => expect(mockCreateTicket).toHaveBeenCalledTimes(1), { timeout: 10000 });
  });

  it('unknown status denies create', async () => {
    mockGetPartnerProfile.mockResolvedValueOnce(makeProfile({ status: 'unknown' }));

    await renderWithProviders(<PartnerNewSupportTicketScreen />);
    await waitFor(
      () =>
        expect(
          screen.getByText('Support tickets are not available for this partner status.'),
        ).toBeTruthy(),
      { timeout: 10000 },
    );
    expect(mockCreateTicket).not.toHaveBeenCalled();
  });
});
