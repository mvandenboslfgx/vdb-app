import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';

import AccountDeletionScreen from '../../app/(customer)/more/account-deletion';
import { accountRepository } from '@/api/repositories/accountRepository';

jest.mock('@/api/repositories/accountRepository');

const mockRequestDeletion = accountRepository.requestDeletion as jest.MockedFunction<
  typeof accountRepository.requestDeletion
>;

describe('AccountDeletionScreen', () => {
  beforeEach(() => {
    mockRequestDeletion.mockReset();
  });

  it('shows the consequences of deletion and disables submit until confirmed', async () => {
    await renderWithProviders(<AccountDeletionScreen />);

    expect(screen.getByTestId('screen-account-deletion')).toBeTruthy();
    expect(screen.getByText(/profile, messages and stored documents/i)).toBeTruthy();
    expect(screen.getByTestId('btn-account-deletion-submit').props.accessibilityState?.disabled).toBe(true);
  });

  it('stays disabled if the confirmation word is wrong', async () => {
    await renderWithProviders(<AccountDeletionScreen />);

    await fireEvent.changeText(screen.getByTestId('input-account-deletion-confirm'), 'delete me');

    expect(screen.getByTestId('btn-account-deletion-submit').props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('btn-account-deletion-submit'));
    expect(mockRequestDeletion).not.toHaveBeenCalled();
  });

  it('calls the real accountRepository.requestDeletion once confirmed and shows the submitted status', async () => {
    mockRequestDeletion.mockResolvedValueOnce({ id: 'del-123', status: 'submitted' });
    await renderWithProviders(<AccountDeletionScreen />);

    await fireEvent.changeText(screen.getByTestId('input-account-deletion-confirm'), 'DELETE');
    expect(screen.getByTestId('btn-account-deletion-submit').props.accessibilityState?.disabled).toBe(false);

    await fireEvent.press(screen.getByTestId('btn-account-deletion-submit'));

    await waitFor(() => expect(mockRequestDeletion).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('screen-account-deletion-status')).toBeTruthy());
    expect(screen.getByTestId('account-deletion-request-id')).toBeTruthy();
  });

  it('shows an error message when the request fails', async () => {
    mockRequestDeletion.mockRejectedValueOnce(new Error('network down'));
    await renderWithProviders(<AccountDeletionScreen />);

    await fireEvent.changeText(screen.getByTestId('input-account-deletion-confirm'), 'DELETE');
    await fireEvent.press(screen.getByTestId('btn-account-deletion-submit'));

    await waitFor(() => expect(screen.getByTestId('account-deletion-error')).toBeTruthy());
    expect(screen.queryByTestId('screen-account-deletion-status')).toBeNull();
  });
});
