import type {
  PortalAppointmentRow,
  PortalAppointmentStatus,
  PortalConversationRow,
  PortalDocumentStatus,
  PortalFileRow,
  PortalInvoiceRow,
  PortalInvoiceStatus,
  PortalMessageRow,
  PortalProjectRow,
  PortalProjectStatus,
  PortalQuoteItemRow,
  PortalQuoteRow,
  PortalQuoteStatus,
  PortalSupportReplyRow,
  PortalSupportTicketRow,
  PortalSupportTicketStatus,
} from '@/api/contract/portalRows';
import type {
  Appointment,
  AppointmentStatus,
  Conversation,
  Document,
  DocumentStatus,
  Invoice,
  InvoiceStatus,
  Message,
  Project,
  ProjectStatus,
  Quote,
  QuoteItem,
  QuoteStatus,
  ScanStatus,
  SupportTicket,
  SupportTicketMessage,
  SupportTicketStatus,
} from '@/types/domain';

const PROJECT_STATUS: Record<PortalProjectStatus, ProjectStatus> = {
  DRAFT: 'request_received',
  PLANNED: 'planning',
  IN_PROGRESS: 'in_progress',
  WAITING_FOR_CUSTOMER: 'waiting_for_customer',
  REVIEW: 'review',
  COMPLETED: 'completed',
  ON_HOLD: 'paused',
  CANCELED: 'cancelled',
  ARCHIVED: 'completed',
};

const QUOTE_STATUS: Record<PortalQuoteStatus, QuoteStatus> = {
  DRAFT: 'draft',
  SENT: 'sent',
  VIEWED: 'viewed',
  ACCEPTED: 'accepted',
  DECLINED: 'rejected',
  EXPIRED: 'expired',
  SUPERSEDED: 'withdrawn',
  CANCELED: 'withdrawn',
};

const INVOICE_STATUS: Record<PortalInvoiceStatus, InvoiceStatus> = {
  DRAFT: 'draft',
  OPEN: 'sent',
  ISSUED: 'sent',
  READY: 'sent',
  IN_REVIEW: 'viewed',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELED: 'cancelled',
  CREDITED: 'credited',
  ARCHIVED: 'cancelled',
};

const DOCUMENT_STATUS: Record<PortalDocumentStatus, DocumentStatus> = {
  UPLOADING: 'processing',
  AVAILABLE: 'available',
  QUARANTINED: 'under_review',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
  DELETED: 'archived',
};

const SUPPORT_TICKET_STATUS: Record<PortalSupportTicketStatus, SupportTicketStatus> = {
  NEW: 'new',
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  WAITING_FOR_CUSTOMER: 'waiting_for_customer',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

const APPOINTMENT_STATUS: Record<PortalAppointmentStatus, AppointmentStatus> = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  RESCHEDULED: 'rescheduled',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
};

const SUPPORT_TICKET_CATEGORIES: ReadonlySet<string> = new Set([
  'billing',
  'project',
  'technical',
  'account',
  'other',
]);

function mapSupportTicketCategory(value: unknown): string {
  const normalized = str(value, 'other').toLowerCase();
  return SUPPORT_TICKET_CATEGORIES.has(normalized) ? normalized : 'other';
}

const SUPPORT_TICKET_PRIORITIES: ReadonlySet<SupportTicket['priority']> = new Set([
  'low',
  'medium',
  'high',
  'urgent',
]);

function mapSupportTicketPriority(value: unknown): SupportTicket['priority'] {
  const raw = str(value).toUpperCase();
  if (raw === 'LOW') return 'low';
  if (raw === 'NORMAL' || raw === 'MEDIUM') return 'medium';
  if (raw === 'HIGH') return 'high';
  if (raw === 'URGENT') return 'urgent';
  const normalized = str(value).toLowerCase();
  return SUPPORT_TICKET_PRIORITIES.has(normalized as SupportTicket['priority'])
    ? (normalized as SupportTicket['priority'])
    : 'medium';
}

/** Mobile priority → owner portal_support_tickets.priority CHECK values. */
export function toOwnerSupportPriority(
  priority: SupportTicket['priority'] | string | undefined,
): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' {
  switch (priority) {
    case 'low':
      return 'LOW';
    case 'high':
      return 'HIGH';
    case 'urgent':
      return 'URGENT';
    case 'medium':
    default:
      return 'NORMAL';
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function nullableStr(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function mapPortalProject(row: PortalProjectRow | Record<string, unknown>): Project {
  const r = asRecord(row);
  const status = str(r.status, 'DRAFT') as PortalProjectStatus;
  return {
    id: str(r.id),
    title: str(r.name) || str(r.title),
    description: str(r.description),
    status: PROJECT_STATUS[status] ?? 'intake',
    customerId: str(r.organization_id),
    progressPercent: num(r.progress_percent),
    nextMilestone: nullableStr(r.planned_delivery_date),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  };
}

export function mapPortalQuoteItem(row: PortalQuoteItemRow | Record<string, unknown>): QuoteItem {
  const r = asRecord(row);
  return {
    id: str(r.id),
    description: str(r.title) || str(r.description),
    quantity: num(r.quantity, 1),
    unitPriceCents: num(r.unit_price_cents),
    vatPercent: num(r.tax_rate_basis_points) / 100,
  };
}

export function mapPortalQuote(
  row: PortalQuoteRow | Record<string, unknown>,
  items: (PortalQuoteItemRow | Record<string, unknown>)[] = [],
): Quote {
  const r = asRecord(row);
  const status = str(r.status, 'DRAFT') as PortalQuoteStatus;
  const number = str(r.quote_number);
  return {
    id: str(r.id),
    number,
    title: str(r.title) || `Offerte ${number}`,
    status: QUOTE_STATUS[status] ?? 'draft',
    validUntil: str(r.valid_until),
    currency: 'EUR',
    subtotalCents: num(r.subtotal_cents),
    vatCents: num(r.vat_cents),
    totalCents: num(r.total_cents),
    items: items.map(mapPortalQuoteItem),
    projectId: nullableStr(r.project_id),
    termsVersion: null,
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  };
}

export function mapPortalInvoice(row: PortalInvoiceRow | Record<string, unknown>): Invoice {
  const r = asRecord(row);
  const status = str(r.status, 'DRAFT') as PortalInvoiceStatus;
  return {
    id: str(r.id),
    number: str(r.invoice_number),
    status: INVOICE_STATUS[status] ?? 'draft',
    issueDate: str(r.issue_date),
    dueDate: str(r.due_date),
    currency: 'EUR',
    subtotalCents: num(r.subtotal_cents),
    vatCents: num(r.vat_cents),
    totalCents: num(r.total_cents),
    amountPaidCents: num(r.amount_paid_cents),
    projectId: nullableStr(r.project_id),
    paymentReference: nullableStr(r.payment_reference),
    pdfAvailable: bool(r.pdf_available),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  };
}

function mapScanStatus(value: unknown): ScanStatus {
  const raw = str(value).toUpperCase();
  if (raw === 'CLEAN') return 'clean';
  if (raw === 'FAILED') return 'failed';
  if (raw === 'SUSPICIOUS' || raw === 'INFECTED') return 'flagged';
  return 'pending';
}

export function mapPortalFile(row: PortalFileRow | Record<string, unknown>): Document {
  const r = asRecord(row);
  const status = str(r.status, 'AVAILABLE') as PortalDocumentStatus;
  return {
    id: str(r.id),
    projectId: nullableStr(r.project_id),
    title: str(r.title) || str(r.file_name),
    status: DOCUMENT_STATUS[status] ?? 'available',
    currentVersion: num(r.version_number, 1),
    mimeType: str(r.mime_type),
    sizeBytes: num(r.size_bytes),
    scanStatus: mapScanStatus(r.scan_status),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  };
}

export interface MapPortalConversationOptions {
  lastReadAt?: string | null;
  unreadCount?: number;
}

export function mapPortalConversation(
  row: PortalConversationRow | Record<string, unknown>,
  opts: MapPortalConversationOptions = {},
): Conversation {
  const r = asRecord(row);
  return {
    id: str(r.id),
    title: str(r.subject) || 'Conversation',
    // The owner schema does not denormalize a preview onto the conversation row;
    // callers that need one must derive it from the latest `portal_messages` row.
    lastMessagePreview: null,
    lastMessageAt: nullableStr(r.last_message_at),
    unreadCount: num(opts.unreadCount, 0),
    projectId: nullableStr(r.project_id),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at) || str(r.created_at),
  };
}

export function mapPortalMessage(row: PortalMessageRow | Record<string, unknown>): Message {
  const r = asRecord(row);
  return {
    id: str(r.id),
    conversationId: str(r.conversation_id),
    senderId: str(r.author_user_id),
    senderName: str(r.sender_name, ''),
    body: str(r.body),
    deliveryStatus: 'sent',
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at) || str(r.created_at),
  };
}

export function mapPortalSupportTicket(
  row: PortalSupportTicketRow | Record<string, unknown>,
): SupportTicket {
  const r = asRecord(row);
  const status = str(r.status, 'NEW').toUpperCase() as PortalSupportTicketStatus;
  return {
    id: str(r.id),
    subject: str(r.subject),
    category: mapSupportTicketCategory(r.category),
    priority: mapSupportTicketPriority(r.priority),
    status: SUPPORT_TICKET_STATUS[status] ?? 'new',
    description: str(r.description),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  };
}

export function mapPortalSupportReply(
  row: PortalSupportReplyRow | Record<string, unknown>,
): SupportTicketMessage {
  const r = asRecord(row);
  return {
    id: str(r.id),
    ticketId: str(r.ticket_id),
    authorId: str(r.author_user_id) || str(r.created_by),
    body: str(r.body),
    isInternal: bool(r.is_internal),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at) || str(r.created_at),
  };
}

export function mapPortalAppointment(
  row: PortalAppointmentRow | Record<string, unknown>,
): Appointment {
  const r = asRecord(row);
  const status = str(r.status, 'SCHEDULED').toUpperCase() as PortalAppointmentStatus;
  return {
    id: str(r.id),
    title: str(r.title),
    startsAt: str(r.starts_at),
    endsAt: str(r.ends_at),
    status: APPOINTMENT_STATUS[status] ?? 'requested',
    location: nullableStr(r.location),
    timezone: 'Europe/Amsterdam',
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at) || str(r.created_at),
  };
}
