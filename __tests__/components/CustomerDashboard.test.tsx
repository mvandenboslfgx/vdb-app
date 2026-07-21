import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';
import { routerMock } from '../../__mocks__/expo-router';

import CustomerHomeScreen from '../../app/(customer)/index';
import { getCustomerDashboard } from '@/api/repositories/customerRepository';
import type { CustomerDashboard, Project } from '@/types/domain';

jest.mock('@/api/repositories/customerRepository');
jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ profile: { id: 'user-1', fullName: 'Jane Doe' } }),
}));

const mockGetDashboard = getCustomerDashboard as jest.MockedFunction<typeof getCustomerDashboard>;

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    title: 'Klantportaal app',
    description: 'Custom mobile app',
    status: 'in_progress',
    customerId: 'user-1',
    progressPercent: 42,
    nextMilestone: 'Design review',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Project;
}

function makeDashboard(overrides: Partial<CustomerDashboard> = {}): CustomerDashboard {
  return {
    welcomeName: 'Jane',
    activeProjects: [],
    openQuotes: [],
    openInvoices: [],
    unreadMessages: 0,
    upcomingAppointments: [],
    documentsPendingReview: 0,
    ...overrides,
  };
}

describe('CustomerDashboard', () => {
  beforeEach(() => {
    routerMock.push.mockReset();
  });

  it('shows an empty state with a CTA when there are no active projects', async () => {
    mockGetDashboard.mockResolvedValueOnce(makeDashboard());
    await renderWithProviders(<CustomerHomeScreen />);

    await waitFor(() => expect(screen.getByTestId('customer-dashboard-screen')).toBeTruthy());
    expect(screen.getByText('You have no active projects yet.')).toBeTruthy();
    expect(screen.getByText('No open quotes.')).toBeTruthy();
    expect(screen.getByText('No open invoices.')).toBeTruthy();
  });

  it('lists active projects and navigates to project detail on press', async () => {
    mockGetDashboard.mockResolvedValueOnce(
      makeDashboard({ activeProjects: [makeProject()], unreadMessages: 3, documentsPendingReview: 1 }),
    );
    await renderWithProviders(<CustomerHomeScreen />);

    await waitFor(() => expect(screen.getByTestId('dashboard-project-proj-1')).toBeTruthy());
    expect(screen.getByText('Klantportaal app')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();

    await fireEvent.press(screen.getByText('Klantportaal app'));
    expect(routerMock.push).toHaveBeenCalledWith('/(customer)/projects/proj-1');
  });

  it('shows an error state with retry when the dashboard fails to load', async () => {
    mockGetDashboard.mockRejectedValueOnce(new Error('network down'));
    await renderWithProviders(<CustomerHomeScreen />);

    await waitFor(() => expect(screen.getByText('Try again')).toBeTruthy());

    mockGetDashboard.mockResolvedValueOnce(makeDashboard({ activeProjects: [makeProject()] }));
    await fireEvent.press(screen.getByText('Try again'));

    await waitFor(() => expect(screen.getByTestId('customer-dashboard-screen')).toBeTruthy());
    expect(screen.getByText('Klantportaal app')).toBeTruthy();
  });
});
