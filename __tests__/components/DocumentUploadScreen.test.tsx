import * as DocumentPicker from 'expo-document-picker';

import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';
import { useLocalSearchParams } from '../../__mocks__/expo-router';

import DocumentUploadScreen from '../../app/(customer)/documents/upload';
import { uploadProjectDocument } from '@/api/repositories/documentsRepository';
import { listProjects } from '@/api/repositories/projectsRepository';
import type { Document } from '@/types/domain';

// jest-expo doesn't ship a document-picker mock, and the real native module
// throws when required outside a device runtime — mock it explicitly
// (matches the expo-web-browser / expo-haptics pattern in jest.setup.js).
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));
jest.mock('@/api/repositories/documentsRepository');
jest.mock('@/api/repositories/projectsRepository');

const mockGetDocumentAsync = DocumentPicker.getDocumentAsync as jest.MockedFunction<
  typeof DocumentPicker.getDocumentAsync
>;
const mockUploadProjectDocument = uploadProjectDocument as jest.MockedFunction<
  typeof uploadProjectDocument
>;
const mockListProjects = listProjects as jest.MockedFunction<typeof listProjects>;

function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: 'doc-1',
    projectId: 'proj-1',
    title: 'Contract.pdf',
    status: 'uploaded',
    currentVersion: 1,
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    scanStatus: 'clean',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  } as Document;
}

describe('DocumentUploadScreen', () => {
  beforeEach(() => {
    useLocalSearchParams.mockReturnValue({ projectId: 'proj-1' });
    mockListProjects.mockResolvedValue([]);
  });

  it('disables submit until a file and title are provided', async () => {
    await renderWithProviders(<DocumentUploadScreen />);

    await waitFor(() => expect(screen.getByTestId('screen-document-upload')).toBeTruthy());
    expect(
      screen.getByTestId('btn-document-upload-submit').props.accessibilityState?.disabled,
    ).toBe(true);
    expect(mockUploadProjectDocument).not.toHaveBeenCalled();
  });

  it('uploads the picked file and shows the success screen', async () => {
    mockGetDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///tmp/contract.pdf',
          name: 'contract.pdf',
          mimeType: 'application/pdf',
          size: 2048,
        },
      ],
    } as DocumentPicker.DocumentPickerResult);
    mockUploadProjectDocument.mockResolvedValueOnce(makeDocument());

    await renderWithProviders(<DocumentUploadScreen />);
    await waitFor(() => expect(screen.getByTestId('btn-document-upload-pick')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('btn-document-upload-pick'));
    await waitFor(() => expect(screen.getByTestId('text-document-upload-filename')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('btn-document-upload-submit'));

    await waitFor(() =>
      expect(mockUploadProjectDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-1',
          title: 'contract.pdf',
          mimeType: 'application/pdf',
          fileName: 'contract.pdf',
          byteSize: 2048,
        }),
      ),
    );
    await waitFor(() => expect(screen.getByTestId('screen-document-upload-success')).toBeTruthy());
  });

  it('rejects a disallowed file type without calling the repository', async () => {
    mockGetDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///tmp/malware.exe',
          name: 'malware.exe',
          mimeType: 'application/x-msdownload',
          size: 1024,
        },
      ],
    } as DocumentPicker.DocumentPickerResult);

    await renderWithProviders(<DocumentUploadScreen />);
    await waitFor(() => expect(screen.getByTestId('btn-document-upload-pick')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('btn-document-upload-pick'));

    await waitFor(() => expect(screen.getByTestId('text-document-upload-error')).toBeTruthy());
    expect(screen.getByText('This file type is not allowed.')).toBeTruthy();
    expect(screen.queryByTestId('text-document-upload-filename')).toBeNull();
    expect(mockUploadProjectDocument).not.toHaveBeenCalled();
  });
});
