/**
 * rc.2 contract surfaces that Mobile may query at runtime.
 * Source of truth: contracts/backend-contract.json (vdb-backend-contract@0.2.0-rc.2).
 */

import {
  mapMobileRpcToOwner,
  MOBILE_TABLE_TO_OWNER,
  OWNER_RPCS,
  OWNER_TABLES,
} from '@/api/contract/ownerMapping';

/** Tables explicitly listed in contracts/backend-contract.json rc.2 sharedDomains. */
export const RC2_OWNER_TABLES = new Set<string>([
  'profiles',
  'organizations',
  'organization_members',
  'portal_projects',
  'portal_quotes',
  'portal_quote_items',
  'portal_quote_versions',
  'portal_quote_acceptances',
  'portal_invoices',
  'portal_invoice_items',
  'portal_files',
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

/** RPCs Mobile may call (canonical owner names from rc.2). */
export const RC2_OWNER_RPCS = new Set<string>([
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
  ...Object.values(OWNER_RPCS),
]);

/** Logical Mobile names that are intentionally NOT in rc.2 sharedDomains. */
export const RC2_UNSUPPORTED_LOGICAL_SURFACES = [
  'conversations',
  'messages',
  'appointments',
  'availability_slots',
  'project_milestones',
  'project_updates',
  'support_tickets',
  'support_ticket_messages',
  'document_versions',
  'document_reviews',
  'account_deletion_requests',
  'reviews',
  'payment_events',
  'partner_links',
  'user_roles',
] as const;

export type UnsupportedLogicalSurface = (typeof RC2_UNSUPPORTED_LOGICAL_SURFACES)[number];

export function isRc2OwnerTable(table: string): boolean {
  return RC2_OWNER_TABLES.has(table);
}

export function resolveRequiredOwnerTable(logicalOrOwner: string): string {
  const owner = MOBILE_TABLE_TO_OWNER[logicalOrOwner] ?? logicalOrOwner;
  if (!isRc2OwnerTable(owner)) {
    throw new Error(`CONTRACT_SURFACE_UNAVAILABLE:${logicalOrOwner}`);
  }
  return owner;
}

export function assertRc2Rpc(logicalOrOwnerRpc: string): string {
  const owner = mapMobileRpcToOwner(logicalOrOwnerRpc);
  if (!RC2_OWNER_RPCS.has(owner)) {
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
