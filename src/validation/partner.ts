import { z } from 'zod';

export const partnerApplicationSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, 'errors.validation.companyNameMin')
    .max(160, 'errors.validation.companyNameMax'),
  contactName: z
    .string()
    .trim()
    .min(2, 'errors.validation.fullNameMin')
    .max(120, 'errors.validation.fullNameMax'),
  email: z
    .string()
    .trim()
    .min(1, 'errors.validation.emailRequired')
    .email('errors.validation.emailInvalid'),
  phone: z
    .string()
    .trim()
    .min(8, 'errors.validation.phoneMin')
    .max(32, 'errors.validation.phoneMax'),
  website: z
    .string()
    .trim()
    .url('errors.validation.urlInvalid')
    .optional()
    .or(z.literal('')),
  kvkNumber: z
    .string()
    .trim()
    .regex(/^\d{8}$/, 'errors.validation.kvkInvalid')
    .optional()
    .or(z.literal('')),
  vatNumber: z
    .string()
    .trim()
    .max(32, 'errors.validation.vatMax')
    .optional()
    .or(z.literal('')),
  motivation: z
    .string()
    .trim()
    .min(20, 'errors.validation.motivationMin')
    .max(2000, 'errors.validation.motivationMax'),
  acceptPartnerTerms: z.literal(true, {
    error: 'errors.validation.acceptPartnerTerms',
  }),
});

export type PartnerApplicationInput = z.infer<typeof partnerApplicationSchema>;
