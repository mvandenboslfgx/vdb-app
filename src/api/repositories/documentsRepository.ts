import { mockStore } from '@/api/mockData';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { createIdempotencyKey } from '@/lib/idempotency';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import { mapDocument } from '@/lib/mappers';
import type { Tables } from '@/types/database.generated';
import type { Document, DocumentStatus } from '@/types/domain';
import type { DocumentReviewDecisionInput } from '@/validation/documents';
import { documentUploadSchema } from '@/validation/documents';

type DocumentRow = Tables<'documents'>;
type DocumentVersionRow = Tables<'document_versions'>;

const DOCUMENTS_BUCKET = 'documents';
/** Scans that must never be opened/downloaded, regardless of caller intent. */
const BLOCKED_SCAN_STATUSES: readonly DocumentVersionRow['scan_status'][] = [
  'flagged',
  'failed',
];

async function fetchVersions(
  supabase: ReturnType<typeof requireLiveSupabase>,
  versionIds: string[],
): Promise<Map<string, DocumentVersionRow>> {
  const map = new Map<string, DocumentVersionRow>();
  if (versionIds.length === 0) return map;
  const { data, error } = await supabase
    .from('document_versions')
    .select('*')
    .in('id', versionIds);
  if (error) throw fromSupabaseError(error);
  for (const row of data ?? []) {
    map.set(row.id, row);
  }
  return map;
}

function toDocuments(rows: DocumentRow[], versions: Map<string, DocumentVersionRow>): Document[] {
  return rows.map((row) =>
    mapDocument(row, row.current_version_id ? versions.get(row.current_version_id) : null),
  );
}

export async function listDocuments(): Promise<Document[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.documents];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (error) throw fromSupabaseError(error);
  const rows = data ?? [];
  const versionIds = rows.map((r) => r.current_version_id).filter((id): id is string => Boolean(id));
  const versions = await fetchVersions(supabase, versionIds);
  return toDocuments(rows, versions);
}

export async function getDocument(id: string): Promise<Document | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.documents.find((d) => d.id === id) ?? null;
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.from('documents').select('*').eq('id', id).maybeSingle();
  if (error) throw fromSupabaseError(error);
  if (!data) return null;
  const versions = await fetchVersions(supabase, data.current_version_id ? [data.current_version_id] : []);
  return toDocuments([data], versions)[0]!;
}

export async function submitReviewDecision(
  id: string,
  input: DocumentReviewDecisionInput,
): Promise<Document> {
  const statusMap: Record<DocumentReviewDecisionInput['decision'], DocumentStatus> = {
    approved: 'approved',
    changes_requested: 'changes_requested',
    rejected: 'rejected',
  };
  const status = statusMap[input.decision];

  if (shouldUseMockApi()) {
    await delay();
    const doc = mockStore.documents.find((d) => d.id === id);
    if (!doc) throw DomainError.notFound('Document not found');
    if (BLOCKED_SCAN_STATUSES.includes(doc.scanStatus)) {
      throw DomainError.forbidden('This file failed its security scan and cannot be reviewed.');
    }
    doc.status = status;
    doc.updatedAt = new Date().toISOString();
    return { ...doc };
  }

  const supabase = requireLiveSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw DomainError.unauthorized('You must be signed in to review a document.');
  }

  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (docError) throw fromSupabaseError(docError);
  if (!doc) throw DomainError.notFound('Document not found');
  if (!doc.current_version_id) {
    throw DomainError.validation('Document has no version to review yet.');
  }

  const versions = await fetchVersions(supabase, [doc.current_version_id]);
  const currentVersion = versions.get(doc.current_version_id);
  if (currentVersion && BLOCKED_SCAN_STATUSES.includes(currentVersion.scan_status)) {
    throw DomainError.forbidden('This file failed its security scan and cannot be reviewed.');
  }

  const { error: reviewError } = await supabase.from('document_reviews').insert({
    document_id: id,
    document_version_id: doc.current_version_id,
    reviewer_id: userData.user.id,
    decision: input.decision,
    comment: input.comment || null,
  });
  if (reviewError) throw fromSupabaseError(reviewError);

  const { data: updated, error: updateError } = await supabase
    .from('documents')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();
  if (updateError) throw fromSupabaseError(updateError);

  return toDocuments([updated], versions)[0]!;
}

/** @deprecated Prefer submitReviewDecision */
export async function reviewDocument(
  id: string,
  decision: 'approved' | 'changes_requested' | 'rejected',
  comment?: string,
): Promise<Document> {
  return submitReviewDecision(id, { decision, comment: comment ?? '' });
}

/**
 * Requests changes on a document. A non-empty, meaningful comment is
 * required -- the reviewer must explain what needs to change. The database
 * also enforces this independently via the `document_reviews_comment_required`
 * CHECK constraint, so this is defense in depth, not the only guard.
 */
export async function requestChanges(id: string, comment: string): Promise<Document> {
  const trimmed = comment.trim();
  if (trimmed.length < 5) {
    throw DomainError.validation(
      'A comment of at least 5 characters is required to request changes.',
    );
  }
  return submitReviewDecision(id, { decision: 'changes_requested', comment: trimmed });
}

export interface DocumentDownloadLink {
  url: string;
  expiresAt: string;
}

/**
 * Creates a short-lived signed URL to open/download a document's current
 * version from the private `documents` storage bucket. Blocked entirely for
 * `flagged`/`failed` scans -- `storage.objects` RLS (see migration
 * 20260720101500) enforces the same rule server-side, so this is defense in
 * depth, not the only guard.
 */
export async function createSignedUrl(documentId: string): Promise<DocumentDownloadLink> {
  if (shouldUseMockApi()) {
    await delay();
    const doc = mockStore.documents.find((d) => d.id === documentId);
    if (!doc) throw DomainError.notFound('Document not found');
    if (BLOCKED_SCAN_STATUSES.includes(doc.scanStatus)) {
      throw DomainError.forbidden('This file failed its security scan and cannot be opened.');
    }
    return {
      url: `https://mock.local/documents/${documentId}/download`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }

  const supabase = requireLiveSupabase();
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle();
  if (docError) throw fromSupabaseError(docError);
  if (!doc) throw DomainError.notFound('Document not found');
  if (!doc.current_version_id) {
    throw DomainError.validation('Document has no version to download yet.');
  }

  const versions = await fetchVersions(supabase, [doc.current_version_id]);
  const currentVersion = versions.get(doc.current_version_id);
  if (!currentVersion) {
    throw DomainError.notFound('Document version not found');
  }
  if (BLOCKED_SCAN_STATUSES.includes(currentVersion.scan_status)) {
    throw DomainError.forbidden('This file failed its security scan and cannot be opened.');
  }

  const expiresInSeconds = 300;
  const { data: signed, error: signError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(currentVersion.storage_path, expiresInSeconds);
  if (signError) throw fromSupabaseError(signError);
  if (!signed?.signedUrl) {
    throw DomainError.configuration('Could not create a signed download URL for this file.');
  }

  return {
    url: signed.signedUrl,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
  };
}

/** @deprecated Prefer createSignedUrl */
export const getDocumentDownloadLink = createSignedUrl;

export interface UploadProjectDocumentInput {
  /** Project to attach the document to. `null`/omitted for a personal, non-project upload. */
  projectId?: string | null;
  /** Add a new version to an existing document instead of creating one. */
  documentId?: string | null;
  title: string;
  category?: string | null;
  /** Local file URI as returned by expo-document-picker. */
  uri: string;
  mimeType: string;
  fileName: string;
  byteSize: number;
  /** Supplied by the caller to make retries safe; generated when omitted. */
  clientUploadId?: string;
  /**
   * Coarse progress (0-100). supabase-js's storage upload has no native
   * progress events in React Native, so this reports fixed milestones
   * (validated -> uploaded -> registered) rather than byte-level progress.
   */
  onProgress?: (percent: number) => void;
}

function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim().replace(/[\\/]/g, '_');
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-140) || 'file';
}

/**
 * Uploads a customer/staff document: validates the file client-side (defense
 * in depth -- the storage bucket policies and `register_document_upload` RPC
 * independently re-check everything), uploads the bytes to the private
 * `documents` bucket, then registers the version via the RPC so
 * `scan_status` always starts at `pending` and can only ever be flipped by
 * staff (`mark_document_scan_clean`).
 */
export async function uploadProjectDocument(input: UploadProjectDocumentInput): Promise<Document> {
  const parsed = documentUploadSchema.safeParse({
    projectId: input.projectId ?? null,
    title: input.title,
    category: input.category ?? '',
    fileName: input.fileName,
    mimeType: input.mimeType,
    byteSize: input.byteSize,
  });
  if (!parsed.success) {
    throw DomainError.validation(parsed.error.issues[0]?.message ?? 'Invalid upload');
  }

  const clientUploadId = input.clientUploadId ?? createIdempotencyKey('doc');

  if (shouldUseMockApi()) {
    await delay(150);
    input.onProgress?.(40);
    await delay(150);
    input.onProgress?.(80);

    const now = new Date().toISOString();
    const existing = input.documentId
      ? mockStore.documents.find((d) => d.id === input.documentId)
      : undefined;

    const doc: Document = existing
      ? {
          ...existing,
          title: input.title,
          status: 'uploaded',
          currentVersion: existing.currentVersion + 1,
          mimeType: input.mimeType,
          sizeBytes: input.byteSize,
          scanStatus: 'pending',
          updatedAt: now,
        }
      : {
          id: `doc-${Date.now()}`,
          projectId: input.projectId ?? null,
          title: input.title,
          status: 'uploaded',
          currentVersion: 1,
          mimeType: input.mimeType,
          sizeBytes: input.byteSize,
          scanStatus: 'pending',
          createdAt: now,
          updatedAt: now,
        };

    if (existing) {
      const idx = mockStore.documents.findIndex((d) => d.id === existing.id);
      mockStore.documents[idx] = doc;
    } else {
      mockStore.documents.unshift(doc);
    }
    input.onProgress?.(100);
    return doc;
  }

  const supabase = requireLiveSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw DomainError.unauthorized('You must be signed in to upload a document.');
  }

  const scope = input.projectId ?? userData.user.id;
  const storagePath = `${scope}/${clientUploadId}/${sanitizeFileName(input.fileName)}`;

  input.onProgress?.(10);
  let blob: Blob;
  try {
    const response = await fetch(input.uri);
    blob = await response.blob();
  } catch (err) {
    throw DomainError.configuration('Could not read the selected file.', { cause: err });
  }
  input.onProgress?.(40);

  const { error: uploadError } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(storagePath, blob, {
    contentType: input.mimeType,
    upsert: false,
  });
  if (uploadError) throw fromSupabaseError(uploadError);
  input.onProgress?.(75);

  const { data: registered, error: rpcError } = await supabase.rpc('register_document_upload', {
    p_title: input.title,
    p_storage_path: storagePath,
    p_mime_type: input.mimeType,
    p_byte_size: input.byteSize,
    p_client_upload_id: clientUploadId,
    p_project_id: input.projectId ?? undefined,
    p_category: input.category || undefined,
    p_checksum_sha256: undefined,
    p_document_id: input.documentId ?? undefined,
  });
  if (rpcError) {
    await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .remove([storagePath])
      .catch(() => undefined);
    throw fromSupabaseError(rpcError);
  }
  input.onProgress?.(100);

  const documentRow = registered as DocumentRow;
  const versions = await fetchVersions(
    supabase,
    documentRow.current_version_id ? [documentRow.current_version_id] : [],
  );
  return toDocuments([documentRow], versions)[0]!;
}

export const documentsRepository = {
  list: listDocuments,
  get: getDocument,
  submitReviewDecision,
  reviewDocument,
  requestChanges,
  createSignedUrl,
  getDownloadLink: createSignedUrl,
  upload: uploadProjectDocument,
};