import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';
import { routerMock } from '../../__mocks__/expo-router';

import RegisterScreen from '../../app/(auth)/register';

const mockSignUp = jest.fn();

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ signUp: mockSignUp }),
}));

async function fillValidForm() {
  await fireEvent.changeText(screen.getByTestId('input-register-full-name'), 'Jane Doe');
  await fireEvent.changeText(screen.getByTestId('input-register-email'), 'jane@example.com');
  await fireEvent.changeText(screen.getByTestId('input-register-password'), 'supersecret');
  await fireEvent.changeText(screen.getByTestId('input-register-confirm-password'), 'supersecret');
  await fireEvent.press(screen.getByTestId('btn-register-accept-terms'));
}

describe('RegisterScreen', () => {
  beforeEach(() => {
    mockSignUp.mockReset();
    routerMock.replace.mockReset();
  });

  it('renders the registration form', async () => {
    await renderWithProviders(<RegisterScreen />);
    expect(screen.getByTestId('auth-register-screen')).toBeTruthy();
    expect(screen.getByTestId('input-register-email')).toBeTruthy();
  });

  it('shows a validation error when terms are not accepted', async () => {
    await renderWithProviders(<RegisterScreen />);
    await fireEvent.changeText(screen.getByTestId('input-register-full-name'), 'Jane Doe');
    await fireEvent.changeText(screen.getByTestId('input-register-email'), 'jane@example.com');
    await fireEvent.changeText(screen.getByTestId('input-register-password'), 'supersecret');
    await fireEvent.changeText(screen.getByTestId('input-register-confirm-password'), 'supersecret');
    await fireEvent.press(screen.getByTestId('auth-register-submit'));

    await waitFor(() => expect(screen.getByTestId('register-error')).toBeTruthy());
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows a validation error when passwords do not match', async () => {
    await renderWithProviders(<RegisterScreen />);
    await fireEvent.changeText(screen.getByTestId('input-register-full-name'), 'Jane Doe');
    await fireEvent.changeText(screen.getByTestId('input-register-email'), 'jane@example.com');
    await fireEvent.changeText(screen.getByTestId('input-register-password'), 'supersecret');
    await fireEvent.changeText(screen.getByTestId('input-register-confirm-password'), 'different');
    await fireEvent.press(screen.getByTestId('btn-register-accept-terms'));
    await fireEvent.press(screen.getByTestId('auth-register-submit'));

    await waitFor(() => expect(screen.getByTestId('register-error')).toBeTruthy());
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('calls signUp and redirects to email verification when confirmation is needed', async () => {
    mockSignUp.mockResolvedValueOnce({ needsEmailConfirmation: true });
    await renderWithProviders(<RegisterScreen />);

    await fillValidForm();
    await fireEvent.press(screen.getByTestId('auth-register-submit'));

    await waitFor(() =>
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'jane@example.com',
        password: 'supersecret',
        fullName: 'Jane Doe',
        phone: undefined,
      }),
    );
    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith({
        pathname: '/(auth)/verify-email',
        params: { email: 'jane@example.com' },
      }),
    );
  });

  it('shows a backend error when signUp rejects (e.g. user already exists)', async () => {
    mockSignUp.mockRejectedValueOnce(new Error('User already registered'));
    await renderWithProviders(<RegisterScreen />);

    await fillValidForm();
    await fireEvent.press(screen.getByTestId('auth-register-submit'));

    await waitFor(() => expect(screen.getByTestId('register-error')).toBeTruthy());
    expect(routerMock.replace).not.toHaveBeenCalled();
  });
});
