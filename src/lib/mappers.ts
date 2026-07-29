/**
 * snake_case (Supabase row) -> camelCase (domain) mappers.
 *
 * These are intentionally pure and defensive: they never fabricate business
 * data. Where the current schema does not (yet) carry a field the domain type
 * needs, we derive a deterministic value from what *is* present (e.g. a quote
 * title from its number) instead of inventing content -- real gaps should
 * surface as empty/neutral values, never as demo content.
 */
import type { Tables } from '@/types/database.generated';
import type {
  Appointment,
  AppointmentSlot,
  Commission,
  Conversation,
  Document,
  Invoice,
  Lead,
  Message,
  PartnerProfile,
  PayoutRequest,
  Project,
  ProjectMilestone,
  ProjectUpdate,
  Quote,
  QuoteItem,
  SupportTicket,
  SupportTicketMessage,
} from '@/types/domain';

type ProjectRow = Tables<'projects'>;
type ProjectMilestoneRow = Tables<'project_milestones'>;
type ProjectUpdateRow = Tables<'project_updates'>;
type ConversationRow = Tables<'conversations'>;
type MessageRow = Tables<'messages'>;
type SupportTicketRow = Tables<'support_tickets'>;
type DocumentRow = Tables<'documents'>;
type DocumentVersionRow = Tables<'document_versions'>;
type QuoteRow = Tables<'quotes'>;
type QuoteItemRow = Tables<'quote_items'>;
type InvoiceRow = Tables<'invoices'>;
type AppointmentRow = Tables<'appointments'>;
type AvailabilitySlotRow = Tables<'availability_slots'>;
type CommissionRow = Tables<'commissions'>;
type PartnerProfileRow = Tables<'partner_profiles'>;
type TermsVersionRow = Tables<'terms_versions'>;
type PartnerLeadRow = Tables<'partner_leads'>;
type PayoutRequestRow = Tables<'payout_requests'>;
type SupportTicketMessageRow = Tables<'support_ticket_messages'>;

function readMetadata(metadata: unknown): Record<string, unknown> {
  return typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

/** DB project_status has `waiting_on_customer`; domain uses `waiting_for_customer`. */
export function mapProjectStatus(status: ProjectRow['status']): Project['status'] {
  return status === 'waiting_on_customer' ? 'waiting_for_customer' : status;
}

export function mapProject(row: ProjectRow): Project {
  const metadata = readMetadata(row.metadata);
  const progressPercent = Number(metadata.progressPercent ?? metadata.progress_percent ?? 0);
  const nextMilestone =
    typeof metadata.nextMilestone === 'string'
      ? metadata.nextMilestone
      : typeof metadata.next_milestone === 'string'
        ? metadata.next_milestone
        : null;

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    status: mapProjectStatus(row.status),
    customerId: row.customer_user_id ?? '',
    progressPercent: Number.isFinite(progressPercent) ? progressPercent : 0,
    nextMilestone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProjectMilestone(row: ProjectMilestoneRow): ProjectMilestone {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    dueDate: row.due_on,
    completedAt: row.completed_at,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProjectUpdate(row: ProjectUpdateRow, authorName = ''): ProjectUpdate {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    body: row.body,
    authorName,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapConversation(
  row: ConversationRow,
  extra: { lastMessagePreview?: string | null; unreadCount?: number } = {},
): Conversation {
  return {
    id: row.id,
    title: row.subject ?? '',
    lastMessagePreview: extra.lastMessagePreview ?? null,
    lastMessageAt: row.last_message_at,
    unreadCount: extra.unreadCount ?? 0,
    projectId: row.project_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapMessage(
  row: MessageRow,
  extra: { senderName?: string; currentUserId?: string } = {},
): Message {
  const senderName = extra.senderName ?? (row.sender_id === extra.currentUserId ? 'You' : '');
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderName,
    body: row.body ?? '',
    deliveryStatus: 'sent',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const TICKET_PRIORITY_TO_DOMAIN: Record<SupportTicketRow['priority'], SupportTicket['priority']> = {
  low: 'low',
  normal: 'medium',
  high: 'high',
  urgent: 'urgent',
};

const TICKET_PRIORITY_TO_DB: Record<SupportTicket['priority'], SupportTicketRow['priority']> = {
  low: 'low',
  medium: 'normal',
  high: 'high',
  urgent: 'urgent',
};

export function mapSupportTicketPriorityToDomain(
  priority: SupportTicketRow['priority'],
): SupportTicket['priority'] {
  return TICKET_PRIORITY_TO_DOMAIN[priority];
}

export function mapSupportTicketPriorityToDb(
  priority: SupportTicket['priority'],
): SupportTicketRow['priority'] {
  return TICKET_PRIORITY_TO_DB[priority];
}

const TICKET_STATUS_TO_DOMAIN: Record<SupportTicketRow['status'], SupportTicket['status']> = {
  open: 'open',
  in_progress: 'waiting_for_vdb',
  waiting_on_customer: 'waiting_for_customer',
  resolved: 'resolved',
  closed: 'closed',
};

export function mapSupportTicketStatus(
  status: SupportTicketRow['status'],
): SupportTicket['status'] {
  return TICKET_STATUS_TO_DOMAIN[status];
}

export function mapSupportTicket(row: SupportTicketRow, description = ''): SupportTicket {
  return {
    id: row.id,
    subject: row.subject,
    category: row.category ?? 'other',
    priority: mapSupportTicketPriorityToDomain(row.priority),
    status: mapSupportTicketStatus(row.status),
    description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDocument(row: DocumentRow, version?: DocumentVersionRow | null): Document {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    status: row.status,
    currentVersion: version?.version_number ?? 0,
    mimeType: version?.mime_type ?? '',
    sizeBytes: version?.byte_size ?? 0,
    scanStatus: version?.scan_status ?? 'pending',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const QUOTE_STATUS_TO_DOMAIN: Record<QuoteRow['status'], Quote['status']> = {
  draft: 'draft',
  sent: 'sent',
  viewed: 'viewed',
  accepted: 'accepted',
  rejected: 'rejected',
  expired: 'expired',
  superseded: 'withdrawn',
};

export function mapQuoteStatus(status: QuoteRow['status']): Quote['status'] {
  return QUOTE_STATUS_TO_DOMAIN[status];
}

export function mapQuoteItem(row: QuoteItemRow): QuoteItem {
  return {
    id: row.id,
    description: row.description,
    quantity: row.quantity,
    unitPriceCents: row.unit_amount_cents,
    vatPercent: row.tax_rate_bps / 100,
  };
}

export function mapQuote(
  row: QuoteRow,
  items: QuoteItemRow[] = [],
  termsVersion?: TermsVersionRow | null,
): Quote {
  return {
    id: row.id,
    number: row.quote_number,
    title: row.notes?.trim() || `Offerte ${row.quote_number}`,
    status: mapQuoteStatus(row.status),
    validUntil: row.valid_until ?? '',
    currency: 'EUR',
    subtotalCents: row.subtotal_cents,
    vatCents: row.tax_cents,
    totalCents: row.total_cents,
    items: items.map(mapQuoteItem),
    projectId: row.project_id,
    termsVersion: termsVersion?.version ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const INVOICE_STATUS_TO_DOMAIN: Record<InvoiceRow['status'], Invoice['status']> = {
  draft: 'draft',
  issued: 'sent',
  partially_paid: 'partially_paid',
  paid: 'paid',
  overdue: 'overdue',
  void: 'cancelled',
  credited: 'credited',
};

export function mapInvoiceStatus(status: InvoiceRow['status']): Invoice['status'] {
  return INVOICE_STATUS_TO_DOMAIN[status];
}

export function mapInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    number: row.invoice_number,
    status: mapInvoiceStatus(row.status),
    issueDate: row.issued_on ?? '',
    dueDate: row.due_on ?? '',
    currency: 'EUR',
    subtotalCents: row.subtotal_cents,
    vatCents: row.tax_cents,
    totalCents: row.total_cents,
    amountPaidCents: row.amount_paid_cents,
    projectId: row.project_id,
    paymentReference: row.payment_reference,
    pdfAvailable: Boolean(row.pdf_storage_path),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Appointments have no dedicated `title` column; we round-trip it through `notes`. */
export function mapAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    title: row.notes ?? 'Afspraak',
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    location: row.location,
    timezone: 'Europe/Amsterdam',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAvailabilitySlot(row: AvailabilitySlotRow): AppointmentSlot {
  return {
    id: row.id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    capacity: row.capacity,
    bookedCount: row.booked_count,
    timezone: 'Europe/Amsterdam',
  };
}

export function mapCommission(
  row: CommissionRow | Record<string, unknown>,
  saleLabel = '',
): Commission {
  const r = row as Record<string, unknown>;
  const id = String(r.id ?? '');
  const partnerId = String(r.partner_id ?? '');
  const saleId = typeof r.sale_id === 'string' ? r.sale_id : '';
  const amountRaw =
    typeof r.commission_amount_cents === 'number'
      ? r.commission_amount_cents
      : typeof r.amount_cents === 'number'
        ? r.amount_cents
        : 0;
  const statusRaw = String(r.status ?? 'pending').toLowerCase();
  const labelFromRow =
    typeof r.sale_label === 'string' ? r.sale_label : typeof r.label === 'string' ? r.label : '';
  return {
    id,
    partnerId,
    saleLabel: saleLabel || labelFromRow || (saleId ? `Sale ${saleId.slice(0, 8)}` : 'Commissie'),
    amountCents: amountRaw,
    currency: 'EUR',
    status: statusRaw as Commission['status'],
    expectedReleaseAt:
      typeof r.hold_until === 'string'
        ? r.hold_until
        : typeof r.expected_release_at === 'string'
          ? r.expected_release_at
          : null,
    createdAt: String(r.created_at ?? ''),
    updatedAt: String(r.updated_at ?? r.created_at ?? ''),
  };
}

export function mapPartnerProfile(
  row: PartnerProfileRow,
  extra: { code?: string; linkUrl?: string } = {},
): PartnerProfile {
  return {
    id: row.id,
    userId: row.user_id,
    companyName: row.company_name,
    code: extra.code ?? '',
    linkUrl: extra.linkUrl ?? '',
    status: row.is_active ? 'active' : 'suspended',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Maps a `payout_requests` row (see 20260720101700_payouts_support_finance.sql) to the domain shape. */
export function mapPayoutRequest(row: PayoutRequestRow): PayoutRequest {
  return {
    id: row.id,
    partnerId: row.partner_id,
    payoutAccountId: row.payout_account_id,
    status: row.status,
    amountCents: row.amount_cents,
    currency: 'EUR',
    submittedAt: row.submitted_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Maps a `support_ticket_messages` row to the domain shape. */
export function mapSupportTicketMessage(row: SupportTicketMessageRow): SupportTicketMessage {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    authorId: row.author_id,
    body: row.body,
    isInternal: row.is_internal,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Maps a partner lead row — supports local `name`/`email` and owner `customer_*` aliases. */
export function mapLead(row: PartnerLeadRow | Record<string, unknown>): Lead {
  const r = row as Record<string, unknown>;
  const name = String(r.name ?? r.customer_name ?? r.contact_name ?? '').trim();
  const email = String(r.email ?? r.customer_email ?? '').trim();
  const statusRaw = String(r.status ?? 'new')
    .trim()
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_');
  const status = (
    ['new', 'contacted', 'qualified', 'converted', 'rejected', 'invalid'].includes(statusRaw)
      ? statusRaw
      : 'new'
  ) as Lead['status'];

  return {
    id: String(r.id ?? ''),
    partnerId: String(r.partner_id ?? ''),
    campaignCode:
      typeof r.campaign_code === 'string'
        ? r.campaign_code
        : typeof r.campaign === 'string'
          ? r.campaign
          : null,
    name: name || email || 'Lead',
    email,
    phone:
      typeof r.phone === 'string'
        ? r.phone
        : typeof r.customer_phone === 'string'
          ? r.customer_phone
          : null,
    interest:
      typeof r.interest === 'string'
        ? r.interest
        : typeof r.product_interest === 'string'
          ? r.product_interest
          : null,
    status,
    notes: typeof r.notes === 'string' ? r.notes : null,
    consentGiven: Boolean(r.consent_given ?? r.consentGiven ?? false),
    consentAt: typeof r.consent_at === 'string' ? r.consent_at : null,
    saleId: typeof r.sale_id === 'string' ? r.sale_id : null,
    convertedAt: typeof r.converted_at === 'string' ? r.converted_at : null,
    rejectedReason: typeof r.rejected_reason === 'string' ? r.rejected_reason : null,
    createdAt: String(r.created_at ?? ''),
    updatedAt: String(r.updated_at ?? r.created_at ?? ''),
  };
}
