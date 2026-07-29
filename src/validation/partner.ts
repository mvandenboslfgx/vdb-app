import { z } from 'zod';

/**
 * Canonical Owner partner types (rc.5). Mobile must not invent competing enums.
 * Dutch: INDIVIDUAL = Particulier, BUSINESS = Zakelijk.
 * Legacy map: particular→INDIVIDUAL; sole_trader|company→BUSINESS.
 */
export const CANONICAL_PARTNER_TYPES = ['INDIVIDUAL', 'BUSINESS'] as const;
export type CanonicalPartnerType = (typeof CANONICAL_PARTNER_TYPES)[number];

export const PARTNER_TYPE_MODEL_STATUS =
  'PARTNER PARTICULIER/ZAKELIJK MODEL NOT IMPLEMENTED — DEPENDENCY RECORDED' as const;

/** Map legacy/product labels → canonical Owner type. Never infer from KVK. */
export function mapLegacyPartnerTypeLabel(
  raw: string | null | undefined,
): CanonicalPartnerType | null {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'individual' || v === 'particulier' || v === 'particular') return 'INDIVIDUAL';
  if (v === 'business' || v === 'zakelijk' || v === 'sole_trader' || v === 'company')
    return 'BUSINESS';
  if (v === 'individual' || v === 'business') return v.toUpperCase() as CanonicalPartnerType;
  if (v === 'INDIVIDUAL'.toLowerCase()) return 'INDIVIDUAL';
  if (v === 'BUSINESS'.toLowerCase()) return 'BUSINESS';
  return null;
}

export const FUTURE_OWNER_ZAKELIJK_VALIDATION = {
  whenOwnerType: 'BUSINESS' as const,
  requireCompanyName: true,
  requireKvkNumber: true,
  note: 'Enforced by Owner submit_partner_application for BUSINESS; INDIVIDUAL must not send KVK.',
} as const;

export const partnerApplicationSchema = z
  .object({
    partnerType: z.enum(['INDIVIDUAL', 'BUSINESS'], {
      error: 'errors.validation.partnerTypeRequired',
    }),
    companyName: z
      .string()
      .trim()
      .max(160, 'errors.validation.companyNameMax')
      .optional()
      .or(z.literal('')),
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
    website: z.string().trim().url('errors.validation.urlInvalid').optional().or(z.literal('')),
    kvkNumber: z
      .string()
      .trim()
      .regex(/^\d{8}$/, 'errors.validation.kvkInvalid')
      .optional()
      .or(z.literal('')),
    vatNumber: z.string().trim().max(32, 'errors.validation.vatMax').optional().or(z.literal('')),
    motivation: z
      .string()
      .trim()
      .min(20, 'errors.validation.motivationMin')
      .max(2000, 'errors.validation.motivationMax'),
    acceptPartnerTerms: z.literal(true, {
      error: 'errors.validation.acceptPartnerTerms',
    }),
  })
  .superRefine((data, ctx) => {
    if (data.partnerType === 'INDIVIDUAL') {
      if (data.kvkNumber && data.kvkNumber.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['kvkNumber'],
          message: 'errors.validation.individualNoKvk',
        });
      }
      return;
    }
    // BUSINESS: company + KVK required (Owner mirror)
    if (!data.companyName || data.companyName.trim().length < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['companyName'],
        message: 'errors.validation.companyNameMin',
      });
    }
    if (!data.kvkNumber || !/^\d{8}$/.test(data.kvkNumber)) {
      ctx.addIssue({
        code: 'custom',
        path: ['kvkNumber'],
        message: 'errors.validation.kvkInvalid',
      });
    }
  });

export type PartnerApplicationInput = z.infer<typeof partnerApplicationSchema>;

export function normalizeOptionalPartnerBusinessFields(input: {
  companyName?: string | null;
  kvkNumber?: string | null;
}): { companyName: string | null; kvkNumber: string | null } {
  const company = (input.companyName ?? '').trim();
  const kvk = (input.kvkNumber ?? '').trim();
  return {
    companyName: company.length > 0 ? company : null,
    kvkNumber: kvk.length > 0 ? kvk : null,
  };
}
