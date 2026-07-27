/**
 * rc.3 contract surfaces that Mobile may query at runtime.
 * Source of truth: contracts/backend-contract.json (vdb-backend-contract@0.2.0-rc.3).
 */

import {
  mapMobileRpcToOwner,
  MOBILE_TABLE_TO_OWNER,
  OWNER_RPCS,
  OWNER_TABLES,
} from '@/api/contract/ownerMapping';

/** Tables explicitly listed in contracts/backend-contract.json rc.3 sharedDomains. */
export const RC3_OWNER_TABLES = new Set<string>([
  'profiles',
  'organizations',
  'organization_members',
  'admin_roles',
  'portal_projects',
  'portal_quotes',
  'portal_quote_items',
  'portal_quote_versions',
  'portal_quote_acceptances',
  'portal_invoices',
  'portal_invoice_items',
  'portal_files',
  'portal_conversations',
  'portal_conversation_participants',
  'portal_messages',
  'portal_message_attachments',
  'portal_support_tickets',
  'portal_support_replies',
  'portal_appointments',
  'portal_appointment_participants',
  'feature_flags',
  'partner_applications',
  'partner_profiles',
  'partner_codes',
  'partner_leads',
  'partner_sales',
  'partner_commissions',
  'partner_payout_requests',
  'partner_payouts',
  'partner_ledger_transactions',
  'partner_ledger_entries',
  'partner_cash_receipts',
  'partner_adjustments',
]);

/** RPCs Mobile may call (canonical owner names from rc.3). */
export const RC3_OWNER_RPCS = new Set<string>([
  'accept_portal_quote',
  'decline_portal_quote',
  'submit_partner_application',
  'review_partner_application',
  'create_partner_lead',
  'review_partner_lead',
  'confirm_partner_sale',
  'request_partner_payout',
  'approve_partner_payout_request',
  'record_partner_payout_paid',
  'feature_flag_enabled',
  'verify_mobile_compat_contracts',
  'verify_partner_admin_contracts',
  'create_portal_conversation',
  'send_portal_message',
  'mark_portal_conversation_read',
  'manage_portal_conversation_participant',
  'reply_portal_support_ticket',
  'assign_portal_support_ticket',
  'transition_portal_support_ticket_status',
  'book_portal_appointment',
  'reschedule_portal_appointment',
  'cancel_portal_appointment',
  'verify_messaging_support_appointments_contracts',
  ...Object.values(OWNER_RPCS),
]);

/** Logical Mobile names that are intentionally NOT in rc.3 sharedDomains. */
export const RC3_UNSUPPORTED_LOGICAL_SURFACES = [
  'availability_slots',
  'project_milestones',
  'project_updates',
  'document_versions',
  'document_reviews',
  'account_deletion_requests',
  'reviews',
  'payment_events',
  'partner_links',
  'user_roles',
] as const;

export type UnsupportedLogicalSurface = (typeof RC3_UNSUPPORTED_LOGICAL_SURFACES)[number];

export function isRc3OwnerTable(table: string): boolean {
  return RC3_OWNER_TABLES.has(table);
}

export function resolveRequiredOwnerTable(logicalOrOwner: string): string {
  const owner = MOBILE_TABLE_TO_OWNER[logicalOrOwner] ?? logicalOrOwner;
  if (!isRc3OwnerTable(owner)) {
    throw new Error(`CONTRACT_SURFACE_UNAVAILABLE:${logicalOrOwner}`);
  }
  return owner;
}

/** @deprecated kept for import-site stability; delegates to the rc.3 RPC allowlist. */
export function assertRc2Rpc(logicalOrOwnerRpc: string): string {
  const owner = mapMobileRpcToOwner(logicalOrOwnerRpc);
  if (!RC3_OWNER_RPCS.has(owner)) {
    throw new Error(`CONTRACT_SURFACE_UNAVAILABLE_RPC:${logicalOrOwnerRpc}`);
  }
  return owner;
}

/** Proven A5 mappings that must always resolve. */
export const REQUIRED_A5_TABLE_MAPPINGS = {
  projects: OWNER_TABLES.projects,
  quotes: OWNER_TABLES.quotes,
  quote_items: OWNER_TABLES.quoteItems,
  invoices: OWNER_TABLES.invoices,
  documents: OWNER_TABLES.documents,
} as const;

/** rc.3 messaging/support/appointments mappings that must always resolve. */
export const REQUIRED_RC3_TABLE_MAPPINGS = {
  conversations: OWNER_TABLES.conversations,
  conversation_participants: OWNER_TABLES.conversationParticipants,
  messages: OWNER_TABLES.messages,
  message_attachments: OWNER_TABLES.messageAttachments,
  support_tickets: OWNER_TABLES.supportTickets,
  support_messages: OWNER_TABLES.supportReplies,
  support_ticket_messages: OWNER_TABLES.supportReplies,
  appointments: OWNER_TABLES.appointments,
  appointment_participants: OWNER_TABLES.appointmentParticipants,
} as const;
