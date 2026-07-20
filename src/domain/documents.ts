export const DOCUMENT_STATUSES = [
  'draft',
  'uploaded',
  'processing',
  'available',
  'under_review',
  'approved',
  'changes_requested',
  'superseded',
  'archived',
  'rejected',
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export type ReviewDecision = 'approved' | 'changes_requested';

export function assertReviewComment(decision: ReviewDecision, comment?: string): void {
  if (decision === 'changes_requested' && !comment?.trim()) {
    throw new Error('Comment required when requesting changes');
  }
}

export function nextStatusAfterReview(decision: ReviewDecision): DocumentStatus {
  return decision === 'approved' ? 'approved' : 'changes_requested';
}

/** Approved versions must not be silently overwritten — new upload starts a new version. */
export function assertCanUploadNewVersion(current: DocumentStatus): void {
  if (current === 'approved') {
    // Allowed, but caller must bump version and reset review cycle.
    return;
  }
  if (current === 'superseded' || current === 'archived') {
    throw new Error('Cannot upload to archived/superseded document');
  }
}

export function statusAfterNewVersionUpload(): DocumentStatus {
  return 'under_review';
}

export const ALLOWED_UPLOAD_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
]);

export function assertAllowedUpload(mimeType: string, sizeBytes: number): void {
  if (!ALLOWED_UPLOAD_MIME.has(mimeType)) {
    throw new Error(`MIME type not allowed: ${mimeType}`);
  }
  if (sizeBytes <= 0 || sizeBytes > 52_428_800) {
    throw new Error('File size out of bounds');
  }
}
