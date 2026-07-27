/**
 * Explicit portal_* row shapes for Mobile domain mapping (rc.2 / owner schema).
 * Kept local so we do not cast through `any` or Mobile proposal generated types.
 */

export type PortalProjectStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_CUSTOMER'
  | 'REVIEW'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'CANCELED'
  | 'ARCHIVED';

export type PortalQuoteStatus =
  'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'SUPERSEDED' | 'CANCELED';

export type PortalInvoiceStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELED'
  | 'CREDITED'
  | 'IN_REVIEW'
  | 'READY'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'ARCHIVED';

export type PortalDocumentStatus =
  'UPLOADING' | 'AVAILABLE' | 'QUARANTINED' | 'REJECTED' | 'ARCHIVED' | 'DELETED';

export interface PortalProjectRow {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: PortalProjectStatus;
  progress_percent: number;
  planned_delivery_date: string | null;
  created_at: string;
  updated_at: string;
  customer_visible?: boolean;
  project_number?: string;
}

export interface PortalQuoteRow {
  id: string;
  organization_id: string;
  quote_number: string;
  title: string;
  description: string | null;
  status: PortalQuoteStatus;
  currency: string;
  subtotal_cents: number;
  vat_cents: number;
  total_cents: number;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
  project_id?: string | null;
}

export interface PortalQuoteItemRow {
  id: string;
  quote_id: string;
  title: string;
  description: string | null;
  quantity: number;
  unit_price_cents: number;
  tax_rate_basis_points: number;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PortalInvoiceRow {
  id: string;
  organization_id: string;
  invoice_number: string;
  status: PortalInvoiceStatus;
  issue_date: string | null;
  due_date: string | null;
  currency: string;
  subtotal_cents: number;
  vat_cents: number;
  total_cents: number;
  created_at: string;
  updated_at: string;
  project_id?: string | null;
  customer_visible?: boolean;
}

export interface PortalFileRow {
  id: string;
  organization_id: string;
  project_id: string | null;
  quote_id: string | null;
  invoice_id: string | null;
  title: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  status: PortalDocumentStatus;
  scan_status?: string | null;
  created_at: string;
  updated_at: string;
  customer_visible?: boolean;
  version_number?: number;
}

export type PortalConversationType = 'DIRECT' | 'PROJECT' | 'SUPPORT' | 'INTERNAL' | string;

export interface PortalConversationRow {
  id: string;
  organization_id: string;
  project_id: string | null;
  subject: string | null;
  status?: string | null;
  last_message_at: string | null;
  conversation_type: PortalConversationType;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalMessageRow {
  id: string;
  conversation_id: string;
  author_user_id: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type PortalSupportTicketStatus =
  'NEW' | 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'RESOLVED' | 'CLOSED';

export interface PortalSupportTicketRow {
  id: string;
  organization_id: string;
  project_id?: string | null;
  ticket_number?: string | null;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: PortalSupportTicketStatus;
  created_by: string | null;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalSupportReplyRow {
  id: string;
  ticket_id: string;
  author_user_id?: string | null;
  created_by?: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
  updated_at?: string;
}

export type PortalAppointmentStatus =
  'SCHEDULED' | 'CONFIRMED' | 'RESCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface PortalAppointmentRow {
  id: string;
  organization_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: PortalAppointmentStatus;
  location: string | null;
  timezone?: string | null;
  meeting_link?: string | null;
  organizer_user_id?: string | null;
  created_at: string;
  updated_at: string;
}
