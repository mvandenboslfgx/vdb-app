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
  addSupportInternalNote: 'add_portal_support_internal_note',
  assignSupportTicket: 'assign_portal_support_ticket',
  transitionSupportTicket: 'transition_portal_support_ticket_status',
  bookAppointment: 'book_portal_appointment',
  rescheduleAppointment: 'reschedule_portal_appointment',
  cancelAppointment: 'cancel_portal_appointment',
  verifyMessagingSupportAppointments: 'verify_messaging_support_appointments_contracts',
  adminDashboardStats: 'admin_dashboard_stats',
  adminWorkQueue: 'admin_work_queue',
  approveCommission: 'approve_partner_commission',
  rejectCommission: 'reject_partner_commission',
  suspendPartner: 'suspend_partner',
  reactivatePartner: 'reactivate_partner',
  adminListProducts: 'admin_list_products',
  adminListPartners: 'admin_list_partners',
  adminListCustomers: 'admin_list_customers',
  adminListProjects: 'admin_list_projects',
  adminListQuotes: 'admin_list_quotes',
  adminListInvoices: 'admin_list_invoices',
  adminListAppointments: 'admin_list_appointments',
  adminGetSettingsSummary: 'admin_get_settings_summary',
  adminGetSecurityStatus: 'admin_get_security_status',
  verifyAdminControlSurface: 'verify_admin_control_surface_contracts',
  adminGetProduct: 'admin_get_product',
  adminGetPartner: 'admin_get_partner',
  adminGetCustomer: 'admin_get_customer',
  adminGetProject: 'admin_get_project',
  adminGetQuote: 'admin_get_quote',
  adminGetInvoice: 'admin_get_invoice',
  adminGetAppointment: 'admin_get_appointment',
  listPortalSupportTicketReplies: 'list_portal_support_ticket_replies',
  submitPartnerApplication: 'submit_partner_application',
  partnerActivationChecklist: 'partner_activation_checklist',
  acceptPartnerAgreement: 'accept_partner_agreement',
  activatePartnerProfile: 'activate_partner_profile',
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
  approve_commission: OWNER_RPCS.approveCommission,
  reject_commission: OWNER_RPCS.rejectCommission,
  suspend_partner: OWNER_RPCS.suspendPartner,
  reactivate_partner: OWNER_RPCS.reactivatePartner,
  admin_dashboard_stats: OWNER_RPCS.adminDashboardStats,
  admin_work_queue: OWNER_RPCS.adminWorkQueue,
  admin_get_product: OWNER_RPCS.adminGetProduct,
  admin_get_partner: OWNER_RPCS.adminGetPartner,
  admin_get_customer: OWNER_RPCS.adminGetCustomer,
  admin_get_project: OWNER_RPCS.adminGetProject,
  admin_get_quote: OWNER_RPCS.adminGetQuote,
  admin_get_invoice: OWNER_RPCS.adminGetInvoice,
  admin_get_appointment: OWNER_RPCS.adminGetAppointment,
  list_portal_support_ticket_replies: OWNER_RPCS.listPortalSupportTicketReplies,
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
