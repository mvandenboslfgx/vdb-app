import * as WebBrowser from 'expo-web-browser';

import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';
import { useLocalSearchParams } from '../../__mocks__/expo-router';

import DocumentDetailScreen from '../../app/(customer)/documents/[id]';
import {
  getDocument,
  getDocumentDownloadLink,
  reviewDocument,
} from '@/api/repositories/documentsRepository';
import type { Document } from '@/types/domain';

jest.mock('@/api/repositories/documentsRepository');

const mockGetDocument = getDocument as jest.MockedFunction<typeof getDocument>;
const mockGetDownloadLink = getDocumentDownloadLink as jest.MockedFunction<
  typeof getDocumentDownloadLink
>;
const mockReviewDocument = reviewDocument as jest.MockedFunction<typeof reviewDocument>;

function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: 'doc-1',
    projectId: 'proj-1',
    title: 'Contract.pdf',
    status: 'under_review',
    currentVersion: 2,
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    scanStatus: 'clean',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Document;
}

describe('DocumentDetailScreen', () => {
  beforeEach(() => {
    useLocalSearchParams.mockReturnValue({ id: 'doc-1' });
  });

  it('shows the document title and scan status', async () => {
    mockGetDocument.mockResolvedValueOnce(makeDocument());
    await renderWithProviders(<DocumentDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('screen-document-detail')).toBeTruthy());
    expect(screen.getByText('Contract.pdf')).toBeTruthy();
    expect(screen.getByText('Clean')).toBeTruthy();
  });

  it('requires a comment before requesting changes', async () => {
    mockGetDocument.mockResolvedValueOnce(makeDocument());
    await renderWithProviders(<DocumentDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('screen-document-detail')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('btn-document-request-changes'));

    await waitFor(() => expect(screen.getByTestId('doc-comment-error')).toBeTruthy());
    expect(mockReviewDocument).not.toHaveBeenCalled();
  });

  it('requests changes once a sufficiently long comment is provided', async () => {
    mockGetDocument.mockResolvedValueOnce(makeDocument());
    mockReviewDocument.mockResolvedValueOnce(makeDocument({ status: 'changes_requested' }));
    await renderWithProviders(<DocumentDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('screen-document-detail')).toBeTruthy());

    await fireEvent.changeText(
      screen.getByTestId('input-document-comment'),
      'Please fix the address on page 2',
    );
    await fireEvent.press(screen.getByTestId('btn-document-request-changes'));

    await waitFor(() =>
      expect(mockReviewDocument).toHaveBeenCalledWith(
        'doc-1',
        'changes_requested',
        'Please fix the address on page 2',
      ),
    );
  });

  it('approves the document without requiring a comment', async () => {
    mockGetDocument.mockResolvedValueOnce(makeDocument());
    mockReviewDocument.mockResolvedValueOnce(makeDocument({ status: 'approved' }));
    await renderWithProviders(<DocumentDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('screen-document-detail')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('btn-document-approve'));

    await waitFor(() => expect(mockReviewDocument).toHaveBeenCalledWith('doc-1', 'approved', ''));
  });

  it('opens a clean document via a freshly requested signed link', async () => {
    mockGetDocument.mockResolvedValueOnce(makeDocument({ scanStatus: 'clean' }));
    mockGetDownloadLink.mockResolvedValueOnce({
      url: 'https://mock.local/documents/doc-1/download',
      expiresAt: '2026-01-01T00:05:00.000Z',
    });
    await renderWithProviders(<DocumentDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('screen-document-detail')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('btn-document-open'));

    await waitFor(() => expect(mockGetDownloadLink).toHaveBeenCalledWith('doc-1'));
    await waitFor(() =>
      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
        'https://mock.local/documents/doc-1/download',
      ),
    );
  });

  it('blocks opening a flagged document and never requests a link', async () => {
    mockGetDocument.mockResolvedValueOnce(makeDocument({ scanStatus: 'flagged' }));
    await renderWithProviders(<DocumentDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('screen-document-detail')).toBeTruthy());

    expect(screen.getByTestId('doc-scan-blocked')).toBeTruthy();
    expect(screen.getByTestId('btn-document-open').props.accessibilityState?.disabled).toBe(true);

    await fireEvent.press(screen.getByTestId('btn-document-open'));

    expect(mockGetDownloadLink).not.toHaveBeenCalled();
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
  });
});
