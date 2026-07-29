import type { LeadStatus } from '@/types/domain';
import type { LeadQualifyStatus } from '@/api/repositories/adminRepository';

export type LeadAction = LeadQualifyStatus | 'convert';

const TRANSITIONS: Record<LeadStatus, readonly LeadAction[]> = {
  new: ['contacted', 'qualified', 'rejected', 'invalid'],
  contacted: ['qualified', 'rejected', 'invalid', 'convert'],
  qualified: ['rejected', 'invalid', 'convert'],
  converted: [],
  rejected: [],
  invalid: [],
};

export function allowedLeadActions(status: LeadStatus): readonly LeadAction[] {
  return TRANSITIONS[status] ?? [];
}

export function canLeadAction(status: LeadStatus, action: LeadAction): boolean {
  return allowedLeadActions(status).includes(action);
}

export function leadActionRequiresReason(action: LeadAction): boolean {
  return action === 'rejected' || action === 'invalid';
}

export function leadActionRequiresConfirm(action: LeadAction): boolean {
  return action === 'rejected' || action === 'invalid' || action === 'convert';
}

/** Owner RPC status casing for review_partner_lead. */
export function toOwnerLeadStatus(status: LeadQualifyStatus): string {
  return status.toUpperCase();
}
