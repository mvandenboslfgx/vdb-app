import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';
import { routerMock } from '../../__mocks__/expo-router';

import NewLeadScreen from '../../app/(partner)/leads/new';
import { createLead } from '@/api/repositories/partnersRepository';
import { DomainError } from '@/lib/errors';
import type { Lead } from '@/types/domain';

jest.mock('@/api/repositories/partnersRepository');

const mockCreateLead = createLead as jest.MockedFunction<typeof createLead>;

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    partnerId: 'partner-1',
    campaignCode: null,
    name: 'Maestro Lead',
    email: 'maestro.lead@example.com',
    phone: null,
    interest: null,
    status: 'new',
    notes: null,
    consentGiven: true,
    consentAt: '2026-07-01T00:00:00.000Z',
    saleId: null,
    convertedAt: null,
    rejectedReason: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('NewLeadScreen', () => {
  beforeEach(() => {
    routerMock.back.mockReset();
  });

  it('disables submit until name, email, and consent are all provided', async () => {
    await renderWithProviders(<NewLeadScreen />);

    await waitFor(() => expect(screen.getByTestId('screen-lead-new')).toBeTruthy());
    expect(screen.getByTestId('btn-lead-submit').props.accessibilityState?.disabled).toBe(true);

    await fireEvent.changeText(screen.getByTestId('input-lead-name'), 'Maestro Lead');
    await fireEvent.changeText(screen.getByTestId('input-lead-email'), 'maestro.lead@example.com');
    expect(screen.getByTestId('btn-lead-submit').props.accessibilityState?.disabled).toBe(true);

    await fireEvent.press(screen.getByTestId('check-lead-consent'));
    expect(screen.getByTestId('btn-lead-submit').props.accessibilityState?.disabled).toBe(false);
    expect(mockCreateLead).not.toHaveBeenCalled();
  });

  it('registers the lead and navigates back on success', async () => {
    mockCreateLead.mockResolvedValueOnce(makeLead());

    await renderWithProviders(<NewLeadScreen />);
    await waitFor(() => expect(screen.getByTestId('input-lead-name')).toBeTruthy());

    await fireEvent.changeText(screen.getByTestId('input-lead-name'), 'Maestro Lead');
    await fireEvent.changeText(screen.getByTestId('input-lead-email'), 'maestro.lead@example.com');
    await fireEvent.press(screen.getByTestId('check-lead-consent'));
    await fireEvent.press(screen.getByTestId('btn-lead-submit'));

    await waitFor(() =>
      expect(mockCreateLead).toHaveBeenCalledWith({
        name: 'Maestro Lead',
        email: 'maestro.lead@example.com',
        phone: undefined,
        interest: undefined,
        notes: undefined,
        consentConfirmed: true,
      }),
    );
    await waitFor(() => expect(routerMock.back).toHaveBeenCalled());
  });

  it('shows an error message and stays on the form when registration fails', async () => {
    mockCreateLead.mockRejectedValueOnce(DomainError.validation('Lead consent required'));

    await renderWithProviders(<NewLeadScreen />);
    await waitFor(() => expect(screen.getByTestId('input-lead-name')).toBeTruthy());

    await fireEvent.changeText(screen.getByTestId('input-lead-name'), 'Maestro Lead');
    await fireEvent.changeText(screen.getByTestId('input-lead-email'), 'maestro.lead@example.com');
    await fireEvent.press(screen.getByTestId('check-lead-consent'));
    await fireEvent.press(screen.getByTestId('btn-lead-submit'));

    await waitFor(() => expect(screen.getByTestId('text-lead-error')).toBeTruthy());
    expect(screen.getByText('Please check your input and try again.')).toBeTruthy();
    expect(routerMock.back).not.toHaveBeenCalled();
  });
});
