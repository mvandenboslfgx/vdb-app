/**
 * Administrative partner review status labels (aligned with Partners web).
 * VERIFIED = administrative review completed — not automatic IDV.
 */
export const ADMIN_REVIEW_STATUS_COPY: Record<
  string,
  { titleNl: string; titleEn: string }
> = {
  NOT_STARTED: {
    titleNl: 'Administratieve partnercontrole niet gestart',
    titleEn: 'Administrative partner review not started',
  },
  PENDING: {
    titleNl: 'Administratieve partnercontrole in beoordeling',
    titleEn: 'Administrative partner review in progress',
  },
  MANUAL_REVIEW: {
    titleNl: 'Aanpassing vereist',
    titleEn: 'Correction required',
  },
  VERIFIED: {
    titleNl: 'Administratieve partnercontrole afgerond',
    titleEn: 'Administrative partner review completed',
  },
  REJECTED: {
    titleNl: 'Administratieve partnercontrole afgewezen',
    titleEn: 'Administrative partner review rejected',
  },
  EXPIRED: {
    titleNl: 'Administratieve partnercontrole verlopen',
    titleEn: 'Administrative partner review expired',
  },
};

export function adminReviewStatusTitle(
  status: string | null | undefined,
  locale: 'nl' | 'en' = 'nl',
): string {
  const key = (status ?? 'NOT_STARTED').toUpperCase();
  const row = ADMIN_REVIEW_STATUS_COPY[key];
  if (!row) {
    return locale === 'nl'
      ? 'Administratieve partnercontrole'
      : 'Administrative partner review';
  }
  return locale === 'nl' ? row.titleNl : row.titleEn;
}
