import { z } from 'zod';

export const leadRegistrationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'errors.validation.leadNameMin')
    .max(120, 'errors.validation.leadNameMax'),
  email: z
    .string()
    .trim()
    .min(1, 'errors.validation.emailRequired')
    .email('errors.validation.emailInvalid'),
  phone: z.string().trim().max(32, 'errors.validation.phoneMax').optional().or(z.literal('')),
  interest: z.string().trim().max(160).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  campaignCode: z.string().trim().max(64).optional().or(z.literal('')),
  consentGiven: z.literal(true, { error: 'errors.validation.leadConsentRequired' }),
});

export type LeadRegistrationInput = z.infer<typeof leadRegistrationSchema>;

export const leadContactUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'errors.validation.leadNameMin')
    .max(120, 'errors.validation.leadNameMax')
    .optional(),
  phone: z.string().trim().max(32, 'errors.validation.phoneMax').optional().or(z.literal('')),
  interest: z.string().trim().max(160).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  markContacted: z.boolean().optional(),
});

export type LeadContactUpdateInput = z.infer<typeof leadContactUpdateSchema>;

export const leadQualifyStatuses = ['contacted', 'qualified', 'rejected', 'invalid'] as const;

export const adminLeadQualifySchema = z
  .object({
    status: z.enum(leadQualifyStatuses, { error: 'errors.validation.decisionRequired' }),
    reason: z
      .string()
      .trim()
      .max(2000, 'errors.validation.commentMax')
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) =>
      (data.status !== 'rejected' && data.status !== 'invalid') ||
      (data.reason !== undefined && data.reason.trim().length >= 3),
    { message: 'errors.validation.rejectReasonMin', path: ['reason'] },
  );

export type AdminLeadQualifyInput = z.infer<typeof adminLeadQualifySchema>;
