/**
 * snake_case (Supabase row) -> camelCase (domain) mappers.
 *
 * These are intentionally pure and defensive: they never fabricate business
 * data. Where the current schema does not (yet) carry a field the domain type
 * needs, we derive a deterministic value from what *is* present (e.g. a quote
 * title from its number) instead of inventing content — real gaps should
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
  Project,
  ProjectMilestone,
  ProjectUpdate,
  Quote,
  QuoteItem,
  SupportTicket,
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

export function mapProjectUpdate(
  row: ProjectUpdateRow,
  authorName = '',
): ProjectUpdate {
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
  const senderName =
    extra.senderName ?? (row.sender_id === extra.currentUserId ? 'You' : '');
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

export function mapSupportTicketStatus(status: SupportTicketRow['status']): SupportTicket['status'] {
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

export function mapCommission(row: CommissionRow, saleLabel = ''): Commission {
  return {
    id: row.id,
    partnerId: row.partner_id,
    saleLabel: saleLabel || `Sale ${row.sale_id.slice(0, 8)}`,
    amountCents: row.commission_amount_cents,
    currency: 'EUR',
    status: row.status,
    expectedReleaseAt: row.hold_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

/** No `leads` table exists in the current schema — kept for the future shape. */
export function mapLead(row: {
  id: string;
  partner_id: string;
  name: string;
  email: string;
  phone: string | null;
  status: Lead['status'];
  notes: string | null;
  created_at: string;
  updated_at: string;
}): Lead {
  return {
    id: row.id,
    partnerId: row.partner_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
