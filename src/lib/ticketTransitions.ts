import type { AdminTicketStatus } from '@/api/repositories/adminRepository';
import type { SupportTicketStatus } from '@/types/domain';

/** Owner portal enum for transition_portal_support_ticket_status. */
export function toOwnerTicketStatus(status: AdminTicketStatus): string {
  switch (status) {
    case 'waiting_on_customer':
      return 'WAITING_FOR_CUSTOMER';
    case 'in_progress':
      return 'IN_PROGRESS';
    case 'open':
      return 'OPEN';
    case 'resolved':
      return 'RESOLVED';
    case 'closed':
      return 'CLOSED';
    default:
      return String(status).toUpperCase();
  }
}

export function nextPrimaryTicketActions(current: SupportTicketStatus): AdminTicketStatus[] {
  switch (current) {
    case 'new':
    case 'open':
      return ['in_progress'];
    case 'in_progress':
    case 'waiting_for_vdb':
      return ['waiting_on_customer', 'resolved'];
    case 'waiting_for_customer':
      return ['in_progress', 'resolved'];
    case 'resolved':
      return ['closed', 'open'];
    case 'closed':
      return ['open'];
    default:
      return ['in_progress'];
  }
}

export function secondaryTicketActions(
  current: SupportTicketStatus,
  primary: AdminTicketStatus[],
): AdminTicketStatus[] {
  const all: AdminTicketStatus[] = [
    'open',
    'in_progress',
    'waiting_on_customer',
    'resolved',
    'closed',
  ];
  return all.filter((s) => !primary.includes(s) && mapAdminToDomain(s) !== current);
}

function mapAdminToDomain(status: AdminTicketStatus): SupportTicketStatus {
  if (status === 'waiting_on_customer') return 'waiting_for_customer';
  if (status === 'in_progress') return 'in_progress';
  return status;
}
