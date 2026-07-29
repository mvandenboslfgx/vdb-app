/**
 * rc.6 contract surfaces that Mobile may query at runtime.
 * Source of truth: contracts/backend-contract.json (vdb-backend-contract@0.2.0-rc.6).
 * Owner bundle: contracts/releases/vdb-backend-contract-0.2.0-rc.6/
 */

import {
  mapMobileRpcToOwner,
  MOBILE_TABLE_TO_OWNER,
  OWNER_RPCS,
  OWNER_TABLES,
} from '@/api/contract/ownerMapping';

/** Tables explicitly listed in contracts/backend-contract.json sharedDomains. */
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

export const RC4_OWNER_TABLES = RC3_OWNER_TABLES;

/** RPCs Mobile may call (canonical owner names from rc.4). */
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
  'add_portal_support_internal_note',
  'assign_portal_support_ticket',
  'transition_portal_support_ticket_status',
  'book_portal_appointment',
  'reschedule_portal_appointment',
  'cancel_portal_appointment',
  'verify_messaging_support_appointments_contracts',
  'admin_dashboard_stats',
  'admin_work_queue',
  'approve_partner_commission',
  'reject_partner_commission',
  'suspend_partner',
  'reactivate_partner',
  'admin_list_products',
  'admin_list_partners',
  'admin_list_customers',
  'admin_list_projects',
  'admin_list_quotes',
  'admin_list_invoices',
  'admin_list_appointments',
  'admin_get_settings_summary',
  'admin_get_security_status',
  'verify_admin_control_surface_contracts',
  'admin_get_product',
  'admin_get_partner',
  'admin_get_customer',
  'admin_get_project',
  'admin_get_quote',
  'admin_get_invoice',
  'admin_get_appointment',
  'list_portal_support_ticket_replies',
  'partner_activation_checklist',
  'accept_partner_agreement',
  'activate_partner_profile',
  'partner_try_activate',
  ...Object.values(OWNER_RPCS),
]);

export const RC4_OWNER_RPCS = RC3_OWNER_RPCS;
export const RC5_OWNER_RPCS = RC3_OWNER_RPCS;

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

/** @deprecated kept for import-site stability; delegates to the rc.4 RPC allowlist. */
export function assertRc2Rpc(logicalOrOwnerRpc: string): string {
  const owner = mapMobileRpcToOwner(logicalOrOwnerRpc);
  if (!RC3_OWNER_RPCS.has(owner)) {
    throw new Error(`CONTRACT_SURFACE_UNAVAILABLE_RPC:${logicalOrOwnerRpc}`);
  }
  return owner;
}

export const REQUIRED_A5_TABLE_MAPPINGS = {
  projects: OWNER_TABLES.projects,
  quotes: OWNER_TABLES.quotes,
  quote_items: OWNER_TABLES.quoteItems,
  invoices: OWNER_TABLES.invoices,
  documents: OWNER_TABLES.documents,
} as const;

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

export const REQUIRED_RC5_DIRECTORY_DETAIL_RPCS = {
  admin_get_product: OWNER_RPCS.adminGetProduct,
  admin_get_partner: OWNER_RPCS.adminGetPartner,
  admin_get_customer: OWNER_RPCS.adminGetCustomer,
  admin_get_project: OWNER_RPCS.adminGetProject,
  admin_get_quote: OWNER_RPCS.adminGetQuote,
  admin_get_invoice: OWNER_RPCS.adminGetInvoice,
  admin_get_appointment: OWNER_RPCS.adminGetAppointment,
  list_portal_support_ticket_replies: OWNER_RPCS.listPortalSupportTicketReplies,
} as const;

export const REQUIRED_RC4_ADMIN_RPCS = {
  admin_dashboard_stats: OWNER_RPCS.adminDashboardStats,
  admin_work_queue: OWNER_RPCS.adminWorkQueue,
  approve_commission: OWNER_RPCS.approveCommission,
  reject_commission: OWNER_RPCS.rejectCommission,
  suspend_partner: OWNER_RPCS.suspendPartner,
  reactivate_partner: OWNER_RPCS.reactivatePartner,
  admin_list_products: OWNER_RPCS.adminListProducts,
  admin_list_partners: OWNER_RPCS.adminListPartners,
  admin_list_customers: OWNER_RPCS.adminListCustomers,
  admin_list_projects: OWNER_RPCS.adminListProjects,
  admin_list_quotes: OWNER_RPCS.adminListQuotes,
  admin_list_invoices: OWNER_RPCS.adminListInvoices,
  admin_list_appointments: OWNER_RPCS.adminListAppointments,
  admin_get_settings_summary: OWNER_RPCS.adminGetSettingsSummary,
  admin_get_security_status: OWNER_RPCS.adminGetSecurityStatus,
} as const;
