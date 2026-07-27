/**
 * Owner-canonical naming for shared staging/local owner schema.
 * Mobile local proposal tables/RPCs are mapped here — not published as canon.
 */

export const OWNER_TABLES = {
  projects: 'portal_projects',
  quotes: 'portal_quotes',
  quoteItems: 'portal_quote_items',
  invoices: 'portal_invoices',
  invoiceItems: 'portal_invoice_items',
  documents: 'portal_files',
  commissions: 'partner_commissions',
  payoutRequests: 'partner_payout_requests',
  sales: 'partner_sales',
  partnerLeads: 'partner_leads',
  profiles: 'profiles',
  featureFlags: 'feature_flags',
  adminRoles: 'admin_roles',
  conversations: 'portal_conversations',
  conversationParticipants: 'portal_conversation_participants',
  messages: 'portal_messages',
  messageAttachments: 'portal_message_attachments',
  supportTickets: 'portal_support_tickets',
  supportReplies: 'portal_support_replies',
  appointments: 'portal_appointments',
  appointmentParticipants: 'portal_appointment_participants',
} as const;

export const OWNER_RPCS = {
  acceptQuote: 'accept_portal_quote',
  rejectQuote: 'decline_portal_quote',
  registerPartnerLead: 'create_partner_lead',
  approvePartnerApplication: 'review_partner_application',
  rejectPartnerApplication: 'review_partner_application',
  requestCommissionPayout: 'request_partner_payout',
  qualifyLead: 'review_partner_lead',
  convertLead: 'confirm_partner_sale',
  featureFlagEnabled: 'feature_flag_enabled',
  verifyMobileCompat: 'verify_mobile_compat_contracts',
  createConversation: 'create_portal_conversation',
  sendMessage: 'send_portal_message',
  markConversationRead: 'mark_portal_conversation_read',
  manageParticipant: 'manage_portal_conversation_participant',
  replySupportTicket: 'reply_portal_support_ticket',
  assignSupportTicket: 'assign_portal_support_ticket',
  transitionSupportTicket: 'transition_portal_support_ticket_status',
  bookAppointment: 'book_portal_appointment',
  rescheduleAppointment: 'reschedule_portal_appointment',
  cancelAppointment: 'cancel_portal_appointment',
  verifyMessagingSupportAppointments: 'verify_messaging_support_appointments_contracts',
} as const;

/** Legacy Mobile proposal RPC names → owner canonical. */
export const MOBILE_RPC_TO_OWNER: Record<string, string> = {
  accept_quote: OWNER_RPCS.acceptQuote,
  reject_quote: OWNER_RPCS.rejectQuote,
  register_partner_lead: OWNER_RPCS.registerPartnerLead,
  approve_partner_application: OWNER_RPCS.approvePartnerApplication,
  reject_partner_application: OWNER_RPCS.rejectPartnerApplication,
  request_commission_payout: OWNER_RPCS.requestCommissionPayout,
  admin_qualify_lead: OWNER_RPCS.qualifyLead,
  admin_convert_lead: OWNER_RPCS.convertLead,
  create_conversation: OWNER_RPCS.createConversation,
  send_message: OWNER_RPCS.sendMessage,
  mark_conversation_read: OWNER_RPCS.markConversationRead,
  manage_conversation_participant: OWNER_RPCS.manageParticipant,
  admin_reply_support_ticket: OWNER_RPCS.replySupportTicket,
  admin_assign_ticket: OWNER_RPCS.assignSupportTicket,
  admin_update_ticket_status: OWNER_RPCS.transitionSupportTicket,
  book_appointment_slot: OWNER_RPCS.bookAppointment,
  reschedule_appointment: OWNER_RPCS.rescheduleAppointment,
  cancel_appointment: OWNER_RPCS.cancelAppointment,
};

/** Legacy Mobile proposal table names → owner canonical. */
export const MOBILE_TABLE_TO_OWNER: Record<string, string> = {
  projects: OWNER_TABLES.projects,
  quotes: OWNER_TABLES.quotes,
  quote_items: OWNER_TABLES.quoteItems,
  invoices: OWNER_TABLES.invoices,
  invoice_items: OWNER_TABLES.invoiceItems,
  documents: OWNER_TABLES.documents,
  commissions: OWNER_TABLES.commissions,
  payout_requests: OWNER_TABLES.payoutRequests,
  sales: OWNER_TABLES.sales,
  app_profiles: OWNER_TABLES.profiles,
  admin_roles: OWNER_TABLES.adminRoles,
  conversations: OWNER_TABLES.conversations,
  conversation_participants: OWNER_TABLES.conversationParticipants,
  messages: OWNER_TABLES.messages,
  message_attachments: OWNER_TABLES.messageAttachments,
  support_tickets: OWNER_TABLES.supportTickets,
  tickets: OWNER_TABLES.supportTickets,
  support_messages: OWNER_TABLES.supportReplies,
  support_ticket_messages: OWNER_TABLES.supportReplies,
  appointments: OWNER_TABLES.appointments,
  appointment_participants: OWNER_TABLES.appointmentParticipants,
};

export function mapMobileTableToOwner(table: string): string {
  return MOBILE_TABLE_TO_OWNER[table] ?? table;
}

export function mapMobileRpcToOwner(rpc: string): string {
  return MOBILE_RPC_TO_OWNER[rpc] ?? rpc;
}

/** Marketing `leads` must never be treated as partner leads. */
export function assertNotMarketingLeadsAlias(table: string): void {
  if (table === 'leads') {
    throw new Error(
      'CONTRACT_DRIFT: use partner_leads (canonical). Marketing leads are a separate owner table.',
    );
  }
}
