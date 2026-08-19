import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';

import LoginScreen from '../../app/(auth)/login';

const mockSignIn = jest.fn();
const mockUseAuth = jest.fn();
const mockReplace = jest.fn();

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockUseAuth.mockReset();
    mockReplace.mockReset();
    mockUseAuth.mockReturnValue({ signIn: mockSignIn, isDemoMode: false });
  });

  it('renders the login form', async () => {
    await renderWithProviders(<LoginScreen />);
    expect(screen.getByTestId('auth-login-screen')).toBeTruthy();
    expect(screen.getByTestId('auth-email-input')).toBeTruthy();
    expect(screen.getByTestId('auth-password-input')).toBeTruthy();
  });

  it('shows a validation error when submitting invalid credentials', async () => {
    await renderWithProviders(<LoginScreen />);
    await fireEvent.changeText(screen.getByTestId('auth-email-input'), 'not-an-email');
    await fireEvent.changeText(screen.getByTestId('auth-password-input'), '');
    await fireEvent.press(screen.getByTestId('auth-login-submit'));

    await waitFor(() => expect(screen.getByTestId('auth-error-message')).toBeTruthy());
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('calls signIn with trimmed credentials on valid submit', async () => {
    mockSignIn.mockResolvedValueOnce(undefined);
    await renderWithProviders(<LoginScreen />);

    await fireEvent.changeText(screen.getByTestId('auth-email-input'), 'demo@vdbdigital.nl');
    await fireEvent.changeText(screen.getByTestId('auth-password-input'), 'supersecret');
    await fireEvent.press(screen.getByTestId('auth-login-submit'));

    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith('demo@vdbdigital.nl', 'supersecret'),
    );
  });

  it('shows a backend error message when signIn rejects', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('errors.auth.bootstrapFailed'));
    await renderWithProviders(<LoginScreen />);

    await fireEvent.changeText(screen.getByTestId('auth-email-input'), 'demo@vdbdigital.nl');
    await fireEvent.changeText(screen.getByTestId('auth-password-input'), 'supersecret');
    await fireEvent.press(screen.getByTestId('auth-login-submit'));

    await waitFor(() => expect(screen.getByTestId('auth-error-message')).toBeTruthy());
    expect(screen.getByTestId('auth-error-message').props.children).not.toBe(
      'E-mail of wachtwoord is onjuist',
    );
  });

  it('shows the demo mode hint when isDemoMode is true', async () => {
    mockUseAuth.mockReturnValue({ signIn: mockSignIn, isDemoMode: true });
    await renderWithProviders(<LoginScreen />);
    expect(screen.getByText(/Demo mode/i)).toBeTruthy();
  });
});
