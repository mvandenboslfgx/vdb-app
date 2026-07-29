/**
 * Partner ticket access — aligned with Partners-web `support_own_tickets`
 * (ALWAYS_SAFE for ACTIVE / PENDING / SUSPENDED) and Owner org-member RLS.
 * INDIVIDUAL vs BUSINESS does not change ticket capabilities.
 * Unknown / missing status is fail-closed.
 */

export type PartnerTicketProfileStatus = 'active' | 'pending' | 'suspended' | 'unknown';

export type PartnerTicketAccess = {
  canList: boolean;
  canDetail: boolean;
  canCreate: boolean;
  canReply: boolean;
  reason: 'active' | 'pending' | 'suspended' | 'unknown_status';
};

export function normalizePartnerTicketStatus(
  raw: string | null | undefined,
): PartnerTicketProfileStatus {
  const status = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (!status) return 'unknown';
  if (status === 'ACTIVE' || status === 'APPROVED') return 'active';
  if (
    status === 'PENDING' ||
    status === 'SUBMITTED' ||
    status === 'UNDER_REVIEW' ||
    status === 'IN_REVIEW' ||
    status === 'DRAFT'
  ) {
    return 'pending';
  }
  if (status === 'SUSPENDED' || status === 'REVOKED') return 'suspended';
  return 'unknown';
}

/**
 * Capability matrix for Mobile Partner tickets.
 * Write access remains subject to Owner RLS (org membership); this gate only
 * encodes status policy so the UI never invents rights for unknown statuses.
 */
export function decidePartnerTicketAccess(status: PartnerTicketProfileStatus): PartnerTicketAccess {
  if (status === 'unknown') {
    return {
      canList: false,
      canDetail: false,
      canCreate: false,
      canReply: false,
      reason: 'unknown_status',
    };
  }
  return {
    canList: true,
    canDetail: true,
    canCreate: true,
    canReply: true,
    reason: status,
  };
}

/** Commercial partner tabs stay active-only; tickets are ALWAYS_SAFE. */
export function partnerCommercialActionsAllowed(status: PartnerTicketProfileStatus): boolean {
  return status === 'active';
}
