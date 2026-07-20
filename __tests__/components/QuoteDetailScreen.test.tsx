import { Alert } from 'react-native';

import { act, fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';
import { useLocalSearchParams } from '../../__mocks__/expo-router';

import QuoteDetailScreen from '../../app/(customer)/quotes/[id]';
import { acceptQuote, getQuote, rejectQuote } from '@/api/repositories/quotesRepository';
import type { Quote } from '@/types/domain';

jest.mock('@/api/repositories/quotesRepository');

const mockGetQuote = getQuote as jest.MockedFunction<typeof getQuote>;
const mockAcceptQuote = acceptQuote as jest.MockedFunction<typeof acceptQuote>;
const mockRejectQuote = rejectQuote as jest.MockedFunction<typeof rejectQuote>;

function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'quote-1',
    number: 'OFF-2026-0001',
    title: 'Website redesign',
    status: 'sent',
    validUntil: '2026-12-31',
    currency: 'EUR',
    subtotalCents: 100000,
    vatCents: 21000,
    totalCents: 121000,
    items: [{ id: 'item-1', description: 'Design', quantity: 1, unitPriceCents: 100000, vatPercent: 21 }],
    projectId: null,
    termsVersion: '1.2',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Simulates the user tapping the "Confirm" button on the native Alert. */
async function confirmAlert() {
  const call = (Alert.alert as jest.Mock).mock.calls.at(-1);
  const buttons = call?.[2] as Array<{ text: string; onPress?: () => void }>;
  const confirmButton = buttons.find((b) => b.text === 'Confirm');
  await act(async () => {
    confirmButton?.onPress?.();
  });
}

describe('QuoteDetailScreen', () => {
  beforeEach(() => {
    useLocalSearchParams.mockReturnValue({ id: 'quote-1' });
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it('shows totals and terms version for an actionable quote', async () => {
    mockGetQuote.mockResolvedValueOnce(makeQuote());
    await renderWithProviders(<QuoteDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('screen-quote-detail')).toBeTruthy());
    expect(screen.getByText(/121[.,]000|1\.210,00|â‚¬\s?1\.210,00/)).toBeTruthy();
    expect(screen.getByTestId('quote-terms-version')).toBeTruthy();
    expect(screen.getByTestId('btn-quote-accept')).toBeTruthy();
  });

  it('requires the terms checkbox before accepting', async () => {
    mockGetQuote.mockResolvedValueOnce(makeQuote());
    await renderWithProviders(<QuoteDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('screen-quote-detail')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('btn-quote-accept'));

    expect(screen.getByTestId('quote-error')).toBeTruthy();
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockAcceptQuote).not.toHaveBeenCalled();
  });

  it('accepts the quote after confirming terms + the confirmation dialog', async () => {
    mockGetQuote.mockResolvedValueOnce(makeQuote());
    mockAcceptQuote.mockResolvedValueOnce(makeQuote({ status: 'accepted' }));
    await renderWithProviders(<QuoteDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('screen-quote-detail')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('checkbox-quote-terms'));
    await fireEvent.press(screen.getByTestId('btn-quote-accept'));

    expect(Alert.alert).toHaveBeenCalled();
    await confirmAlert();

    await waitFor(() =>
      expect(mockAcceptQuote).toHaveBeenCalledWith({ quoteId: 'quote-1', acceptTerms: true }),
    );
    await waitFor(() => expect(screen.getByTestId('quote-message')).toBeTruthy());
  });

  it('guards against double-tapping accept while a request is in flight', async () => {
    mockGetQuote.mockResolvedValueOnce(makeQuote());
    let resolveAccept: (quote: Quote) => void = () => undefined;
    mockAcceptQuote.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAccept = resolve;
        }),
    );
    await renderWithProviders(<QuoteDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('screen-quote-detail')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('checkbox-quote-terms'));
    await fireEvent.press(screen.getByTestId('btn-quote-accept'));
    await confirmAlert();

    await waitFor(() => expect(mockAcceptQuote).toHaveBeenCalledTimes(1));

    // Second tap while busy should be a no-op â€” button press handler bails out early.
    await fireEvent.press(screen.getByTestId('btn-quote-accept'));
    expect(mockAcceptQuote).toHaveBeenCalledTimes(1);

    resolveAccept(makeQuote({ status: 'accepted' }));
    await waitFor(() => expect(screen.getByTestId('quote-message')).toBeTruthy());
  });

  it('shows an error message when accepting fails', async () => {
    mockGetQuote.mockResolvedValueOnce(makeQuote());
    mockAcceptQuote.mockRejectedValueOnce(new Error('network down'));
    await renderWithProviders(<QuoteDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('screen-quote-detail')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('checkbox-quote-terms'));
    await fireEvent.press(screen.getByTestId('btn-quote-accept'));
    await confirmAlert();

    await waitFor(() => expect(screen.getByTestId('quote-error')).toBeTruthy());
  });

  it('supports rejecting with an optional reason', async () => {
    mockGetQuote.mockResolvedValueOnce(makeQuote());
    mockRejectQuote.mockResolvedValueOnce(makeQuote({ status: 'rejected' }));
    await renderWithProviders(<QuoteDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('screen-quote-detail')).toBeTruthy());

    await fireEvent.changeText(screen.getByTestId('input-quote-reject-reason'), 'Too expensive');
    await fireEvent.press(screen.getByTestId('btn-quote-reject'));
    await confirmAlert();

    await waitFor(() => expect(mockRejectQuote).toHaveBeenCalledWith('quote-1', 'Too expensive'));
    await waitFor(() => expect(screen.getByTestId('quote-message')).toBeTruthy());
  });

  it('is read-only once the quote has already been accepted', async () => {
    mockGetQuote.mockResolvedValueOnce(makeQuote({ status: 'accepted' }));
    await renderWithProviders(<QuoteDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('quote-readonly-notice')).toBeTruthy());
    expect(screen.queryByTestId('btn-quote-accept')).toBeNull();
    expect(screen.queryByTestId('btn-quote-reject')).toBeNull();
  });
});
