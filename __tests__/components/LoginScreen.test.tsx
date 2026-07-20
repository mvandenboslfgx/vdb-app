import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';

import LoginScreen from '../../app/(auth)/login';

const mockSignIn = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({ signIn: mockSignIn, isDemoMode: false });
  });

  it('renders the login form', async () => {
    await renderWithProviders(<LoginScreen />);
    expect(screen.getByTestId('screen-auth-login')).toBeTruthy();
    expect(screen.getByTestId('input-login-email')).toBeTruthy();
    expect(screen.getByTestId('input-login-password')).toBeTruthy();
  });

  it('shows a validation error when submitting invalid credentials', async () => {
    await renderWithProviders(<LoginScreen />);
    await fireEvent.changeText(screen.getByTestId('input-login-email'), 'not-an-email');
    await fireEvent.changeText(screen.getByTestId('input-login-password'), '');
    await fireEvent.press(screen.getByTestId('btn-login-submit'));

    await waitFor(() => expect(screen.getByTestId('login-error')).toBeTruthy());
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('calls signIn with trimmed credentials on valid submit', async () => {
    mockSignIn.mockResolvedValueOnce(undefined);
    await renderWithProviders(<LoginScreen />);

    await fireEvent.changeText(screen.getByTestId('input-login-email'), 'demo@vdbdigital.nl');
    await fireEvent.changeText(screen.getByTestId('input-login-password'), 'supersecret');
    await fireEvent.press(screen.getByTestId('btn-login-submit'));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith('demo@vdbdigital.nl', 'supersecret'));
  });

  it('shows a backend error message when signIn rejects', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('Invalid login credentials'));
    await renderWithProviders(<LoginScreen />);

    await fireEvent.changeText(screen.getByTestId('input-login-email'), 'demo@vdbdigital.nl');
    await fireEvent.changeText(screen.getByTestId('input-login-password'), 'supersecret');
    await fireEvent.press(screen.getByTestId('btn-login-submit'));

    await waitFor(() => expect(screen.getByTestId('login-error')).toBeTruthy());
  });

  it('shows the demo mode hint when isDemoMode is true', async () => {
    mockUseAuth.mockReturnValue({ signIn: mockSignIn, isDemoMode: true });
    await renderWithProviders(<LoginScreen />);
    expect(screen.getByText(/Demo mode/i)).toBeTruthy();
  });
});
