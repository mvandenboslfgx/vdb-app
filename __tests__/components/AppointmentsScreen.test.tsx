import { Alert } from 'react-native';

import { act, fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';
import { routerMock } from '../../__mocks__/expo-router';

import AppointmentsScreen from '../../app/(customer)/appointments/index';
import { cancelAppointment, listAppointments } from '@/api/repositories/appointmentsRepository';
import type { Appointment } from '@/types/domain';

jest.mock('@/api/repositories/appointmentsRepository');

const mockListAppointments = listAppointments as jest.MockedFunction<typeof listAppointments>;
const mockCancelAppointment = cancelAppointment as jest.MockedFunction<typeof cancelAppointment>;

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'appt-1',
    title: 'Kickoff call',
    startsAt: '2026-08-01T09:00:00.000Z',
    endsAt: '2026-08-01T09:30:00.000Z',
    status: 'confirmed',
    location: null,
    timezone: 'Europe/Amsterdam',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

async function confirmAlert() {
  const call = (Alert.alert as jest.Mock).mock.calls.at(-1);
  const buttons = call?.[2] as Array<{ text: string; onPress?: () => void }>;
  const confirmButton = buttons.find((b) => b.text === 'Confirm');
  await act(async () => {
    confirmButton?.onPress?.();
  });
}

describe('AppointmentsScreen', () => {
  beforeEach(() => {
    routerMock.push.mockReset();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it('shows an empty state when there are no appointments', async () => {
    mockListAppointments.mockResolvedValueOnce([]);
    await renderWithProviders(<AppointmentsScreen />);

    await waitFor(() => expect(screen.getByTestId('screen-appointments')).toBeTruthy());
    expect(screen.getByText('No upcoming appointments.')).toBeTruthy();
  });

  it('lists appointments with their status', async () => {
    mockListAppointments.mockResolvedValueOnce([makeAppointment()]);
    await renderWithProviders(<AppointmentsScreen />);

    await waitFor(() => expect(screen.getByTestId('appointment-row-appt-1')).toBeTruthy());
    expect(screen.getByText('Kickoff call')).toBeTruthy();
    expect(screen.getByText('Confirmed')).toBeTruthy();
  });

  it('shows a book appointment button that navigates to the booking screen', async () => {
    mockListAppointments.mockResolvedValueOnce([]);
    await renderWithProviders(<AppointmentsScreen />);

    await waitFor(() => expect(screen.getByTestId('btn-appointments-book')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('btn-appointments-book'));

    expect(routerMock.push).toHaveBeenCalledWith('/(customer)/appointments/book');
  });

  it('cancels an appointment after confirmation', async () => {
    mockListAppointments.mockResolvedValueOnce([makeAppointment()]);
    mockCancelAppointment.mockResolvedValueOnce(makeAppointment({ status: 'cancelled' }));
    await renderWithProviders(<AppointmentsScreen />);

    await waitFor(() => expect(screen.getByTestId('btn-appointment-cancel-appt-1')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('btn-appointment-cancel-appt-1'));

    expect(Alert.alert).toHaveBeenCalled();
    await confirmAlert();

    await waitFor(() => expect(mockCancelAppointment).toHaveBeenCalledWith('appt-1'));
  });

  it('does not show a cancel button for a completed appointment', async () => {
    mockListAppointments.mockResolvedValueOnce([makeAppointment({ status: 'completed' })]);
    await renderWithProviders(<AppointmentsScreen />);

    await waitFor(() => expect(screen.getByTestId('appointment-row-appt-1')).toBeTruthy());
    expect(screen.queryByTestId('btn-appointment-cancel-appt-1')).toBeNull();
  });
});
