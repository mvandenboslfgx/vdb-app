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
