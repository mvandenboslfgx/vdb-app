import type {
  PortalDocumentStatus,
  PortalFileRow,
  PortalInvoiceRow,
  PortalInvoiceStatus,
  PortalProjectRow,
  PortalProjectStatus,
  PortalQuoteItemRow,
  PortalQuoteRow,
  PortalQuoteStatus,
} from '@/api/contract/portalRows';
import type {
  Document,
  DocumentStatus,
  Invoice,
  InvoiceStatus,
  Project,
  ProjectStatus,
  Quote,
  QuoteItem,
  QuoteStatus,
  ScanStatus,
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
