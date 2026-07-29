import { z } from 'zod';

export const documentReviewDecisionSchema = z
  .object({
    decision: z.enum(['approved', 'changes_requested', 'rejected'], {
      error: 'errors.validation.decisionRequired',
    }),
    comment: z
      .string()
      .trim()
      .max(2000, 'errors.validation.commentMax')
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) =>
      data.decision === 'approved' || (data.comment !== undefined && data.comment.length >= 5),
    {
      message: 'errors.validation.reviewCommentRequired',
      path: ['comment'],
    },
  );

export type DocumentReviewDecisionInput = z.infer<typeof documentReviewDecisionSchema>;

/**
 * Client-side upload allow-list. Defense in depth only -- the
 * `register_document_upload` RPC (see
 * supabase/migrations/20260720101600_business_flow_completion.sql)
 * independently blocks executable extensions/mime types server-side, and the
 * `documents` storage bucket policies restrict *where* a file can land.
 * Nothing here, or there, ever accepts an executable.
 */
export const ALLOWED_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
] as const;

export type AllowedUploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];

/** 25MB, matching the RPC-side limit. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Extensions that must never be uploaded, regardless of the reported mime type. */
export const BLOCKED_UPLOAD_EXTENSIONS = [
  'exe',
  'bat',
  'cmd',
  'sh',
  'msi',
  'dll',
  'apk',
  'jar',
  'com',
  'scr',
  'ps1',
  'vbs',
  'app',
  'deb',
  'rpm',
] as const;

function fileExtension(fileName: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(fileName.trim());
  return match ? match[1]!.toLowerCase() : '';
}

export const documentUploadSchema = z
  .object({
    projectId: z.string().trim().uuid('errors.validation.projectRequired').nullable().optional(),
    title: z
      .string()
      .trim()
      .min(2, 'errors.validation.documentTitleMin')
      .max(160, 'errors.validation.documentTitleMax'),
    category: z
      .string()
      .trim()
      .max(60, 'errors.validation.documentCategoryMax')
      .optional()
      .or(z.literal('')),
    fileName: z.string().trim().min(1, 'errors.validation.documentFileRequired'),
    mimeType: z
      .string()
      .trim()
      .min(1, 'errors.validation.documentFileRequired')
      .refine((value) => (ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(value), {
        message: 'errors.validation.documentMimeNotAllowed',
      }),
    byteSize: z
      .number()
      .int()
      .positive('errors.validation.documentFileRequired')
      .max(MAX_UPLOAD_BYTES, 'errors.validation.documentTooLarge'),
  })
  .refine(
    (data) =>
      !(BLOCKED_UPLOAD_EXTENSIONS as readonly string[]).includes(fileExtension(data.fileName)),
    { message: 'errors.validation.documentMimeNotAllowed', path: ['fileName'] },
  );

export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
