import { z } from 'zod';

export const quoteAcceptSchema = z.object({
  quoteId: z.string().uuid('errors.validation.quoteIdInvalid'),
  acceptTerms: z.literal(true, {
    error: 'errors.validation.acceptQuoteTerms',
  }),
});

export type QuoteAcceptInput = z.infer<typeof quoteAcceptSchema>;

export const quoteRejectSchema = z.object({
  quoteId: z.string().uuid('errors.validation.quoteIdInvalid'),
  reason: z
    .string()
    .trim()
    .min(5, 'errors.validation.rejectReasonMin')
    .max(1000, 'errors.validation.rejectReasonMax'),
});

export type QuoteRejectInput = z.infer<typeof quoteRejectSchema>;
