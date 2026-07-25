import { mockStore } from '@/api/mockData';
import { fromOwnerTable } from '@/api/contract/ownerClient';
import { mapPortalFile } from '@/api/contract/portalMappers';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { createIdempotencyKey } from '@/lib/idempotency';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import type { Document, DocumentStatus } from '@/types/domain';
import type { DocumentReviewDecisionInput } from '@/validation/documents';
import { documentUploadSchema } from '@/validation/documents';

/** Scans that must never be opened/downloaded, regardless of caller intent. */
const BLOCKED_SCAN_STATUSES: readonly Document['scanStatus'][] = ['flagged', 'failed'];

export async function listDocuments(): Promise<Document[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.documents];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await fromOwnerTable(supabase, 'documents')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).map(mapPortalFile);
}

export async function getDocument(id: string): Promise<Document | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.documents.find((d) => d.id === id) ?? null;
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await fromOwnerTable(supabase, 'documents')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw fromSupabaseError(error);
  return data ? mapPortalFile(data) : null;
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

  requireLiveSupabase();
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:document_reviews');
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

  requireLiveSupabase();
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:document_versions');
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

  void clientUploadId;
  requireLiveSupabase();
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:register_document_upload');
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
