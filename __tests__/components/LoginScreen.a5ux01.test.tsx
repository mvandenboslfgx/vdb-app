import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';
import { i18n } from '@/i18n';

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

describe('LoginScreen A5-UX-01', () => {
  beforeEach(async () => {
    mockSignIn.mockReset();
    mockUseAuth.mockReset();
    mockReplace.mockReset();
    mockUseAuth.mockReturnValue({ signIn: mockSignIn, isDemoMode: false });
    await i18n.changeLanguage('nl');
  });

  it('shows accessible invalid-credentials error in NL', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('errors.auth.invalidCredentials'));
    await renderWithProviders(<LoginScreen />);

    await fireEvent.changeText(screen.getByTestId('auth-email-input'), 'user@example.com');
    await fireEvent.changeText(screen.getByTestId('auth-password-input'), 'wrong-pass');
    await fireEvent.press(screen.getByTestId('auth-login-submit'));

    const alert = await waitFor(() => screen.getByTestId('auth-error-message'));
    expect(alert.props.accessibilityRole).toBe('alert');
    expect(alert.props.accessibilityLiveRegion).toBe('polite');
    expect(String(alert.props.children)).toMatch(/onjuist/i);
  });

  it('shows accessible invalid-credentials error in EN', async () => {
    await i18n.changeLanguage('en');
    mockSignIn.mockRejectedValueOnce(new Error('errors.auth.invalidCredentials'));
    await renderWithProviders(<LoginScreen />);

    await fireEvent.changeText(screen.getByTestId('auth-email-input'), 'user@example.com');
    await fireEvent.changeText(screen.getByTestId('auth-password-input'), 'wrong-pass');
    await fireEvent.press(screen.getByTestId('auth-login-submit'));

    const alert = await waitFor(() => screen.getByTestId('auth-error-message'));
    expect(alert.props.accessibilityRole).toBe('alert');
    expect(String(alert.props.children)).toMatch(/incorrect/i);
  });

  it('shows a distinct network error (not credentials)', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('errors.auth.network'));
    await renderWithProviders(<LoginScreen />);

    await fireEvent.changeText(screen.getByTestId('auth-email-input'), 'user@example.com');
    await fireEvent.changeText(screen.getByTestId('auth-password-input'), 'whatever12');
    await fireEvent.press(screen.getByTestId('auth-login-submit'));

    const alert = await waitFor(() => screen.getByTestId('auth-error-message'));
    expect(String(alert.props.children)).toMatch(/verbinding|internet/i);
    expect(String(alert.props.children)).not.toMatch(/onjuist/i);
  });
});
